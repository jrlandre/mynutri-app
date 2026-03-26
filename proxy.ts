/**
 * PROXY — Next.js 16+ convention (substitui middleware.ts)
 *
 * Este arquivo é detectado e executado automaticamente pelo Next.js 16
 * como o arquivo de proxy da aplicação. O nome CORRETO é "proxy.ts"
 * (não "middleware.ts"). O export principal deve se chamar "proxy",
 * não "middleware".
 *
 * Referência: https://nextjs.org/docs/messages/middleware-to-proxy
 * Confirmação: .next/dev/server/middleware.js referencia este arquivo
 * como INNER_MIDDLEWARE_MODULE em tempo de compilação.
 *
 * NÃO renomear para middleware.ts.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

async function resolveTenant(request: NextRequest): Promise<string | null> {
  const host = request.headers.get('host') ?? ''
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/\./g, '\\.')
  const match = appDomain ? host.match(new RegExp(`^([^.]+)\\.${appDomain}$`)) : null
  if (!match) return null
  const subdomain = match[1]

  const { data } = await adminClient
    .from('experts')
    .select('name, system_prompt')
    .eq('subdomain', subdomain)
    .eq('active', true)
    .maybeSingle()

  if (!data) return null

  return JSON.stringify({
    subdomain,
    expertName: data.name,
    systemPrompt: data.system_prompt ?? '',
  })
}

// Rate limiting lazy — só ativa se KV estiver configurado
async function buildLimiters() {
  const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  if (!hasKV) return null

  const { Ratelimit } = await import('@upstash/ratelimit')
  const { kv } = await import('@vercel/kv')

  return {
    global: new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(500, "1 h"), prefix: "" }),
    ip:     new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(200, "1 h"), prefix: "" }),
  }
}

export async function proxy(request: NextRequest) {
  // Resolver tenant e injetar no request (lido pela API route via x-tenant-config)
  const tenantJson = await resolveTenant(request)
  const requestHeaders = new Headers(request.headers)
  if (tenantJson) {
    requestHeaders.set('x-tenant-config', tenantJson)
  }

  // Rate limiting aplicado somente ao endpoint de IA (/api/analyze).
  // Rotas baratas (histórico, auth, painel, etc.) não são limitadas aqui —
  // cada uma delas é uma query simples ao banco sem custo de API externa.
  const isAnalyze = request.nextUrl.pathname.startsWith('/api/analyze')
  if (isAnalyze) {
    try {
      const limiters = await buildLimiters()
      if (limiters) {
        const globalLimit = await limiters.global.limit("ratelimit_global")
        if (!globalLimit.success) {
          return NextResponse.json(
            { error: "limite_atingido", message: "Muitas análises em pouco tempo. Tente novamente em alguns minutos.", retryAfter: 60 },
            { status: 429 }
          )
        }

        const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null
        if (ip) {
          const ipLimit = await limiters.ip.limit(`ratelimit_ip_${ip}`)
          if (!ipLimit.success) {
            return NextResponse.json(
              { error: "limite_atingido", message: "Muitas análises em pouco tempo. Tente novamente em alguns minutos.", retryAfter: 60 },
              { status: 429 }
            )
          }
        }
      }
    } catch {
      // KV indisponível ou mal configurado — continua sem rate limiting
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: '/api/:path*',
}
