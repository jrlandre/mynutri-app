import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting lazy — só ativa se KV estiver configurado
async function buildLimiters() {
  const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  if (!hasKV) return null

  const { Ratelimit } = await import('@upstash/ratelimit')
  const { kv } = await import('@vercel/kv')

  return {
    global: new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(500, "1 h"), prefix: "" }),
    ip:     new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(20,  "1 h"), prefix: "" }),
  }
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const limiters = await buildLimiters()
    if (!limiters) return NextResponse.next()

    const isWebhook = request.nextUrl.pathname.startsWith('/api/webhook')

    const globalLimit = await limiters.global.limit("ratelimit_global")
    if (!globalLimit.success) {
      return NextResponse.json(
        { error: "limite_atingido", message: "Muitas análises em pouco tempo. Tente novamente em alguns minutos.", retryAfter: 60 },
        { status: 429 }
      )
    }

    if (!isWebhook) {
      const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim()
      const ipLimit = await limiters.ip.limit(`ratelimit_ip_${ip}`)
      if (!ipLimit.success) {
        return NextResponse.json(
          { error: "limite_atingido", message: "Muitas análises em pouco tempo. Tente novamente em alguns minutos.", retryAfter: 60 },
          { status: 429 }
        )
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
