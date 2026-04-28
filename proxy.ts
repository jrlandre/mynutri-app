/**
 * PROXY — Next.js 16+ convention (substitui middleware.ts)
 *
 * Referência: https://nextjs.org/docs/messages/middleware-to-proxy
 * NÃO renomear para middleware.ts.
 *
 * Responsabilidades:
 * 1. Rotas de API (qualquer host): injetar x-tenant-config + rate limiting
 * 2. Páginas em subdomínio (ana.mynutri.pro): pass-through
 * 3. Páginas no domínio principal: roteamento de locale via next-intl
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createNextIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlHandler = createNextIntlMiddleware(routing)

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '')
    .replace(/^https?:\/\//, '').replace(/\/$/, '')

  const isApiRoute = pathname.startsWith('/api/')
  const isSubdomain = appDomain && host !== appDomain && host.endsWith(`.${appDomain}`)

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

  // ── Páginas em subdomínio: rewrite interno com detecção de locale ──────────
  // Sem isso, `/` não encontra `app/[locale]/page.tsx` e retorna 404, porque
  // o intlHandler não roda em subdomínios e o segmento [locale] fica ausente.
  // Detectamos o locale pelo Accept-Language do browser para suporte internacional.
  // ── Todas as Páginas: roteamento de locale (next-intl) ─────────
  return intlHandler(request)
}

export const config = {
  // Cobre páginas públicas + API; exclui rotas de app autenticado, _next e arquivos estáticos
  matcher: ['/((?!_next|sudo|r/|.*\\..*).*)'],
}
