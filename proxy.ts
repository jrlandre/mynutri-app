/**
 * PROXY — Next.js 16+ convention (substitui middleware.ts)
 *
 * Referência: https://nextjs.org/docs/messages/middleware-to-proxy
 * NÃO renomear para middleware.ts.
 *
 * Responsabilidades:
 * 1. Rotas de API (qualquer host): injetar x-tenant-config + rate limiting
 * 2. Páginas (todos os hosts): refresh de sessão Supabase + roteamento de locale via next-intl
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import createNextIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlHandler = createNextIntlMiddleware(routing)

const cookieDomain = (() => {
  try {
    const h = new URL(process.env.NEXT_PUBLIC_APP_URL ?? '').hostname
    return h && h !== 'localhost' ? `.${h}` : undefined
  } catch { return undefined }
})()

// Extrai o subdomain do host por regex — sem chamada de rede, seguro no Edge.
// O route handler faz o fetch do expert e do system_prompt em Node.js runtime.
function resolveSubdomain(request: NextRequest): string | null {
  const host = request.headers.get('host') ?? ''
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/\./g, '\\.')
  const match = appDomain ? host.match(new RegExp(`^([^.]+)\\.${appDomain}$`)) : null
  return match ? match[1] : null
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

// Refresh de sessão Supabase: verifica JWT e renova se expirado.
// Retorna a resposta com os cookies de sessão atualizados (se houve renovação).
// Também atualiza request.cookies in-place para que o intlHandler enxergue a sessão nova.
async function refreshSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookieDomain ? { domain: cookieDomain } : {},
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          // Atualiza os cookies do request para que a sessão nova seja visível downstream
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Reconstrói o response para que os Set-Cookie cheguem ao browser
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Dispara verificação/renovação do JWT. Erros de rede são ignorados —
  // o server component vai lidar com sessão ausente normalmente.
  await supabase.auth.getUser().catch(() => {})

  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '')
    .replace(/^https?:\/\//, '').replace(/\/$/, '')

  const isApiRoute = pathname.startsWith('/api/')

  // ── Rotas de API: tenant resolution + rate limiting ────────────────────────
  if (isApiRoute) {
    const subdomain = resolveSubdomain(request)
    const requestHeaders = new Headers(request.headers)
    if (subdomain) requestHeaders.set('x-tenant-subdomain', subdomain)
    requestHeaders.set('x-request-id', crypto.randomUUID())

    const isAnalyze = pathname.startsWith('/api/analyze')
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
        // KV indisponível — continua sem rate limiting
      }
    }

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // ── Páginas: refresh de sessão Supabase + roteamento de locale ─────────────
  // O refresh DEVE ocorrer antes do intlHandler para que:
  // 1. O JWT renovado seja gravado nos cookies da resposta
  // 2. O Server Component seguinte enxergue a sessão válida sem tentar escrever cookies
  const sessionResponse = await refreshSession(request)

  // Aplica roteamento de locale (next-intl). O request já tem os cookies atualizados
  // in-place (via request.cookies.set dentro de refreshSession), então o intlHandler
  // enxerga a sessão correta se precisar.
  const intlResponse = intlHandler(request)

  // Propaga os cookies de sessão renovada para a resposta final do intlHandler.
  // Se não houve renovação, sessionResponse.cookies estará vazio e este loop é no-op.
  sessionResponse.cookies.getAll().forEach(({ name, value, ...rest }) => {
    intlResponse.cookies.set(name, value, rest)
  })

  return intlResponse
}

export const config = {
  // Cobre páginas públicas + API; exclui rotas de app autenticado, _next e arquivos estáticos
  matcher: ['/((?!_next|sudo|r/|.*\\..*).*)'],
}
