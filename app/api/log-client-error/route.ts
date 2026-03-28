import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

interface ClientErrorPayload {
  message?: string
  source?: string
  lineno?: number
  colno?: number
  url?: string
  stack?: string
}

// Rate limiting lazy — mesmo padrão do restante do projeto
async function buildRatelimit() {
  const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  if (!hasKV) return null
  const { Ratelimit } = await import('@upstash/ratelimit')
  const { kv } = await import('@vercel/kv')
  return new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'ratelimit_log_client_' })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'

  const rl = await buildRatelimit()
  if (rl && ip !== 'unknown') {
    const { success } = await rl.limit(ip)
    if (!success) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }
  }

  let body: ClientErrorPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  logger.error('client', body.message ?? 'Erro client-side sem mensagem', {
    source: body.source,
    lineno: body.lineno,
    colno: body.colno,
    url: body.url,
    stack: body.stack?.substring(0, 500),
    ip,
    userAgent: request.headers.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
