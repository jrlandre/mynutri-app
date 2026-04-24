import { after } from 'next/server'
import { streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

interface GeminiFileRef {
  name: string
  uri: string
  mimeType: string
  supabase_path: string
  size: number
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!

async function getJobOrThrowEdge(jobId: string, expertId: string) {
  // Uses service role key (bypasses RLS). expert_id filter is the isolation guarantee.
  // expertId MUST come from verified auth.getUser() — never from request body.
  const params = new URLSearchParams({
    'id': `eq.${jobId}`,
    'expert_id': `eq.${expertId}`,
    'select': '*',
    'limit': '1',
  })
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/expert_prompt_jobs?${params}`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      signal: AbortSignal.timeout(5_000),
    }
  )
  if (!res.ok) throw new Error(`supabase_fetch_error_${res.status}`)
  const [job] = await res.json()
  if (!job) throw new Error('Job not found or forbidden')
  return job
}

export async function POST(req: Request) {
  let jobId: string, locale: string
  try {
    const body = await req.json()
    jobId = body.job_id
    locale = body.locale
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
  }

  if (!['pt', 'en'].includes(locale)) {
    return new Response(JSON.stringify({ error: 'invalid_locale' }), { status: 400 })
  }

  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token) return new Response('Unauthorized', { status: 401 })

  const supabaseEdge = createClient(SUPABASE_URL, ANON_KEY)
  const { data: { user } } = await supabaseEdge.auth.getUser(token)
  if (!user) return new Response('Unauthorized', { status: 401 })
  const expertId = user.id

  let job: { status: string; gemini_files: GeminiFileRef[]; supabase_paths: string[] }
  try {
    job = await getJobOrThrowEdge(jobId, expertId)
  } catch {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
  }

  if (job.status !== 'generating') {
    return new Response(JSON.stringify({ error: 'files_not_ready' }), { status: 409 })
  }

  const geminiFiles = job.gemini_files
  if (geminiFiles.length === 0) {
    return new Response(JSON.stringify({ error: 'no_files' }), { status: 400 })
  }

  const targetLang = locale === 'en' ? 'English' : 'Portuguese (Brazil)'
  const google = createGoogleGenerativeAI({ apiKey: GEMINI_KEY })

  const result = streamText({
    model: google('gemini-2.5-pro-preview-05-06'),
    system: `You are a Senior Prompt Engineer specializing in Nutrition and Health. Your sole task is to analyze professional materials and generate a System Prompt for a virtual health assistant. Output MUST be in ${targetLang}. Unbreakable rule: return EXCLUSIVELY the generated prompt text. No greetings, no markdown fences, no "Here is". Start on the first word, end on the last period.`,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Analyze the following professional materials (presentations, guides, protocols, or references) from a nutrition or health expert. Extract their communication style, methodology, tone, specific focus areas, and any recurring guidelines or restrictions they apply. Based on this analysis, write a detailed and precise System Prompt that will instruct a virtual assistant to replicate this expert\'s unique approach when responding to clients.',
        },
        ...geminiFiles.map(f => ({ type: 'file' as const, mediaType: f.mimeType, data: f.uri })),
      ],
    }],

    onFinish: async ({ finishReason }) => {
      const isSuccess = finishReason === 'stop' || finishReason === 'length'

      after(async () => {
        // Delete Gemini files and Supabase storage files
        await Promise.allSettled([
          ...geminiFiles.map(f =>
            fetch(`https://generativelanguage.googleapis.com/v1beta/${f.name}`, {
              method: 'DELETE',
              headers: { 'x-goog-api-key': GEMINI_KEY },
            })
          ),
          fetch(`${SUPABASE_URL}/storage/v1/object/expert-materials`, {
            method: 'DELETE',
            headers: {
              apikey: SERVICE_KEY,
              Authorization: `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prefixes: job.supabase_paths }),
          }),
        ])

        // Atomic finalization: success debits credit, error refunds it
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/finalize_prompt_job`, {
          method: 'POST',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_job_id: jobId, p_expert_id: expertId, p_success: isSuccess }),
        })
      })
    },
  })

  return result.toTextStreamResponse()
}
