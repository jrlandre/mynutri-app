import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  const flowId = randomUUID()
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()

  try {
    const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    if (hasKV) {
      const { kv } = await import('@vercel/kv')

      const countKey = `auth_flow_ip_${ip}`
      const count = await kv.incr(countKey)
      if (count === 1) await kv.expire(countKey, 3600)

      if (count > 20) {
        await new Promise(r => setTimeout(r, 2000))
        return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })
      }

      await kv.set(`auth_flow_${flowId}`, { ip, emailChecks: 0 }, { ex: 900 })
    }
  } catch {
    // KV indisponível — sem rate limiting
  }

  return NextResponse.json({
    flowId,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  })
}
