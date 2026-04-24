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

const ALLOWED_MIME = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/mp4', 'video/mp4', 'text/plain', 'text/markdown',
])

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!

export async function POST(request: NextRequest) {
  const guard = await requireExpert()
  if (isResponse(guard)) return guard as unknown as Response

  const { expert } = guard
  const expertId = expert.id

  let jobId: string, path: string
  try {
    const body = await request.json()
    jobId = body.job_id
    path = body.path
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (!jobId || !path) return Response.json({ error: 'missing_fields' }, { status: 400 })

  const { data: job } = await adminClient
    .from('expert_prompt_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('expert_id', expertId)
    .single()

  if (!job) return Response.json({ error: 'not_found' }, { status: 404 })
  if (!(job.supabase_paths as string[]).includes(path)) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const existingFile = (job.gemini_files as unknown as GeminiFileRef[]).find(f => f.supabase_path === path)
  if (existingFile) return Response.json({ gemini_file_name: existingFile.name })

  const supabaseFileUrl = `${SUPABASE_URL}/storage/v1/object/authenticated/expert-materials/${path}`

  const headRes = await fetch(supabaseFileUrl, {
    method: 'HEAD',
    headers: { Authorization: `Bearer ${SERVICE_KEY}` },
    signal: AbortSignal.timeout(5_000),
  })
  if (!headRes.ok) return Response.json({ error: 'file_not_found' }, { status: 404 })

  const contentLength = Number(headRes.headers.get('content-length') ?? '0')
  if (contentLength === 0) return Response.json({ error: 'empty_file' }, { status: 400 })

  const alreadyUploaded = (job.gemini_files as unknown as GeminiFileRef[]).reduce((sum, f) => sum + (f.size ?? 0), 0)
  if (alreadyUploaded + contentLength > 15 * 1024 * 1024) {
    return Response.json({ error: 'total_size_exceeded' }, { status: 413 })
  }

  const expectedSeconds = contentLength / (512 * 1024)
  const transferTimeoutMs = Math.min(55_000, Math.max(20_000, (expectedSeconds + 15) * 1000))
  const downloadSignal = AbortSignal.timeout(transferTimeoutMs)
  const initiateSignal = AbortSignal.timeout(10_000)
  const uploadSignal = AbortSignal.timeout(transferTimeoutMs)

  const supabaseRes = await fetch(supabaseFileUrl, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}` },
    signal: downloadSignal,
  })
  if (!supabaseRes.ok) return Response.json({ error: 'download_failed' }, { status: 502 })

  // Read enough bytes for file-type detection
  const MAGIC_BYTES_MIN_READ = 4_100
  const reader = supabaseRes.body!.getReader()
  const headerChunks: Uint8Array[] = []
  let headerSize = 0

  try {
    while (headerSize < MAGIC_BYTES_MIN_READ) {
      const { done, value } = await reader.read()
      if (done) break
      headerChunks.push(value)
      headerSize += value.length
    }
  } catch {
    await reader.cancel()
    return Response.json({ error: 'stream_read_error' }, { status: 502 })
  }

  if (headerSize === 0) return Response.json({ error: 'empty_file' }, { status: 400 })

  const headerBuffer = new Uint8Array(headerSize)
  let offset = 0
  for (const chunk of headerChunks) { headerBuffer.set(chunk, offset); offset += chunk.length }

  const { fileTypeFromBuffer } = await import('file-type')
  const detected = await fileTypeFromBuffer(headerBuffer)
  const mime = detected?.mime ?? 'text/plain'
  if (!ALLOWED_MIME.has(mime)) {
    await reader.cancel()
    return Response.json({ error: 'unsupported_type', mime }, { status: 415 })
  }

  // Reassemble full stream using pull() to respect backpressure
  let headerYielded = false
  const fullStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (!headerYielded) {
          controller.enqueue(headerBuffer)
          headerYielded = true
          return
        }
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      } catch (err) {
        controller.error(err)
      }
    },
    cancel() { reader.cancel() },
  })

  const filename = path.split('/').pop()!

  const initiateRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_KEY,
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(contentLength),
        'X-Goog-Upload-Header-Content-Type': mime,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { displayName: filename } }),
      signal: initiateSignal,
    }
  )
  if (!initiateRes.ok) {
    return Response.json({ error: 'gemini_session_failed', status: initiateRes.status }, { status: 502 })
  }
  const uploadUrl = initiateRes.headers.get('x-goog-upload-url')
  if (!uploadUrl) return Response.json({ error: 'gemini_session_failed' }, { status: 502 })

  let uploadRes: Response
  try {
    uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Command': 'upload, finalize',
        'X-Goog-Upload-Offset': '0',
        'Content-Type': mime,
        'Content-Length': String(contentLength),
      },
      body: fullStream,
      signal: uploadSignal,
      ...({ duplex: 'half' } as object),
    } as RequestInit)
  } catch {
    return Response.json({ error: 'upload_network_error' }, { status: 504 })
  }

  if (!uploadRes.ok) return Response.json({ error: 'gemini_upload_failed' }, { status: 502 })

  const { file: geminiFile } = await uploadRes.json()

  const { error: appendError } = await adminClient.rpc('append_gemini_file', {
    p_job_id: jobId,
    p_file: {
      name: geminiFile.name,
      uri: geminiFile.uri,
      mimeType: mime,
      supabase_path: path,
      size: contentLength,
    },
  })

  if (appendError) {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${geminiFile.name}`,
      { method: 'DELETE', headers: { 'x-goog-api-key': GEMINI_KEY } }
    )
    if (appendError.message?.includes('total_size_exceeded')) {
      return Response.json({ error: 'total_size_exceeded' }, { status: 413 })
    }
    return Response.json({ error: 'db_append_failed' }, { status: 500 })
  }

  return Response.json({ gemini_file_name: geminiFile.name })
}
