import { NextRequest } from 'next/server'
import { requireExpert, isResponse } from '@/lib/painel/guard'
import { adminClient } from '@/lib/supabase/admin'

export const maxDuration = 60
export const runtime = 'nodejs'

interface GeminiFileRef {
  name: string
  uri: string
  mimeType: string
  supabase_path: string
  size: number
}

const GEMINI_HEADERS = { 'x-goog-api-key': process.env.GOOGLE_GENERATIVE_AI_API_KEY! }

export async function GET(request: NextRequest) {
  const guard = await requireExpert()
  if (isResponse(guard)) return guard as unknown as Response

  const { expert } = guard
  const expertId = expert.id
  const jobId = request.nextUrl.searchParams.get('job_id')

  if (!jobId) return Response.json({ error: 'missing_job_id' }, { status: 400 })

  const { data: job } = await adminClient
    .from('expert_prompt_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('expert_id', expertId)
    .single()

  if (!job) return Response.json({ error: 'not_found' }, { status: 404 })

  const geminiFiles = job.gemini_files as unknown as GeminiFileRef[]
  if (geminiFiles.length === 0) return Response.json({ ready: false, files: [] })

  const fileResults = await Promise.allSettled(
    geminiFiles.map(async (f) => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${f.name}`,
        { headers: GEMINI_HEADERS, signal: AbortSignal.timeout(10_000) }
      )
      if (!res.ok) throw new Error(`status_check_failed: ${res.status}`)
      const info = await res.json()
      return { name: f.name, uri: f.uri, mimeType: f.mimeType, state: info.state as string }
    })
  )

  const fileStatuses = fileResults.map((r, i) => {
    const f = geminiFiles[i]
    if (r.status === 'fulfilled') return r.value
    return { name: f.name, uri: f.uri, mimeType: f.mimeType, state: 'PROCESSING' as const }
  })

  const failed = fileStatuses.filter(f => f.state === 'FAILED')

  if (failed.length > 0) {
    await Promise.allSettled(
      failed.map(f =>
        fetch(`https://generativelanguage.googleapis.com/v1beta/${f.name}`, {
          method: 'DELETE',
          headers: GEMINI_HEADERS,
          signal: AbortSignal.timeout(10_000),
        })
      )
    )
    await adminClient.rpc('remove_failed_gemini_files', {
      p_job_id: jobId,
      p_failed_names: failed.map(f => f.name),
    })
  }

  const remainingStatuses = fileStatuses.filter(f => f.state !== 'FAILED')

  if (remainingStatuses.length === 0) {
    return Response.json({ ready: false, all_failed: true, files: [] }, { status: 422 })
  }

  const ready = remainingStatuses.every(f => f.state === 'ACTIVE')

  if (ready) {
    await adminClient
      .from('expert_prompt_jobs')
      .update({ status: 'generating' })
      .eq('id', jobId)
      .eq('expert_id', expertId)
  }

  return Response.json({ ready, files: remainingStatuses.map(f => ({ name: f.name, state: f.state })) })
}
