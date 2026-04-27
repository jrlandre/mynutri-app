import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { Expert } from '@/types'
export { CLIENT_LIMIT } from '@/lib/plans'

export interface GuardResult {
  expert: Expert
  isAdmin: boolean
}

function extractSubdomain(host: string): string | null {
  if (process.env.NODE_ENV === 'development' && process.env.PAINEL_DEV_SUBDOMAIN) {
    return process.env.PAINEL_DEV_SUBDOMAIN
  }
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!appDomain) return null
  const match = host.match(new RegExp(`^([^.]+)\\.${appDomain.replace(/\./g, '\\.')}$`))
  const sub = match?.[1]
  if (!sub || sub === 'www') return null
  return sub
}

export async function requireExpert(): Promise<GuardResult | Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Verifica se o usuário logado é Admin (is_admin = true)
  const { data: adminCheck } = await adminClient
    .from('experts')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = adminCheck?.is_admin === true

  // Tenta extrair o subdomínio da requisição (útil se o usuário gerenciar múltiplos painéis)
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const subdomain = extractSubdomain(host)

  let query = adminClient
    .from('experts')
    .select('*')
    .eq('active', true)

  if (!isAdmin || !subdomain) {
    query = query.eq('user_id', user.id)
  }

  if (subdomain) {
    query = query.eq('subdomain', subdomain)
  }

  const { data: expert, error } = await query.limit(1).maybeSingle()

  if (error) throw new Error(error.message)

  if (!expert) {
    return Response.json({ error: 'Acesso negado' }, { status: 403 })
  }

  return { expert: expert as unknown as Expert, isAdmin }
}

export function isResponse(v: GuardResult | Response): v is Response {
  return v instanceof Response
}
