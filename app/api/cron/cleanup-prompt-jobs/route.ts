import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export const maxDuration = 60
export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_HEADERS = { 'x-goog-api-key': process.env.GOOGLE_GENERATIVE_AI_API_KEY! }

// uploading/polling: stale after 30 min; generating: stale after 2h (Gemini inference can be slow)
const STALE_UPLOAD_MS = 30 * 60 * 1000
const STALE_GENERATE_MS = 2 * 60 * 60 * 1000

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const cutoffUpload = new Date(now - STALE_UPLOAD_MS).toISOString()
  const cutoffGenerate = new Date(now - STALE_GENERATE_MS).toISOString()

  const { data: staleJobs } = await adminClient
    .from('expert_prompt_jobs')
    .select('id, expert_id, generation_id, gemini_files, supabase_paths, status')
    .or(
      `and(status.in.(uploading,polling),created_at.lt.${cutoffUpload}),` +
      `and(status.eq.generating,created_at.lt.${cutoffGenerate})`
    )

  if (!staleJobs?.length) return NextResponse.json({ cleaned: 0 })

  const BATCH_SIZE = 5
  const globalDeadline = Date.now() + 55_000
  let cleaned = 0
  let skipped = 0

  for (let i = 0; i < staleJobs.length; i += BATCH_SIZE) {
    if (Date.now() >= globalDeadline) break

    const batch = staleJobs.slice(i, i + BATCH_SIZE)

    const results = await Promise.allSettled(
      batch.map(async (job) => {
        const remaining = () => Math.min(10_000, Math.max(0, globalDeadline - Date.now()))

        await Promise.allSettled(
          (job.gemini_files as { name: string }[]).map(f =>
            fetch(`https://generativelanguage.googleapis.com/v1beta/${f.name}`, {
              method: 'DELETE',
              headers: GEMINI_HEADERS,
              signal: AbortSignal.timeout(remaining()),
            })
          )
        )

        const paths = job.supabase_paths as string[]
        if (paths?.length) {
          await fetch(`${SUPABASE_URL}/storage/v1/object/expert-materials`, {
            method: 'DELETE',
            headers: {
              apikey: SERVICE_KEY,
              Authorization: `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prefixes: paths }),
            signal: AbortSignal.timeout(remaining()),
          })
        }

        await fetch(`${SUPABASE_URL}/rest/v1/rpc/finalize_prompt_job`, {
          method: 'POST',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_job_id: job.id,
            p_expert_id: job.expert_id,
            p_success: false,
          }),
          signal: AbortSignal.timeout(remaining()),
        })
      })
    )

    cleaned += results.filter(r => r.status === 'fulfilled').length
    skipped += results.filter(r => r.status === 'rejected').length
  }

  return NextResponse.json({ cleaned, skipped, total: staleJobs.length })
}
