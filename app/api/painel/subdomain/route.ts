import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireExpert, isResponse } from '@/lib/painel/guard'
import { logger } from '@/lib/logger'

const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const MSG = {
  pt: {
    invalid: 'Subdomínio inválido.',
    same: 'Já é o seu subdomínio atual.',
    cooldown: (d: number) => `Você só pode mudar o subdomínio 1 vez a cada 30 dias. Disponível em ${d} dias.`,
    taken: 'Este subdomínio já está em uso.',
    vercel_rate_limit: 'Muitas requisições à API de domínios. Tente novamente em alguns minutos.',
  },
  en: {
    invalid: 'Invalid subdomain.',
    same: 'This is already your current subdomain.',
    cooldown: (d: number) => `You can change your subdomain once every 30 days. Available in ${d} days.`,
    taken: 'This subdomain is already taken.',
    vercel_rate_limit: 'Too many domain API requests. Please try again in a few minutes.',
  },
} as const

async function addVercelDomain(subdomain: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) throw new Error('Vercel API not configured')

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const fqdn = `${subdomain}.${appDomain}`

  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: fqdn }),
  })

  if (!res.ok) {
    if (res.status === 429) throw new Error('__rate_limit__')
    const body = await res.json() as { error?: { message?: string } }
    throw new Error(body.error?.message ?? 'Vercel domain error')
  }
}

async function removeVercelDomain(subdomain: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) return

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const fqdn = `${subdomain}.${appDomain}`

  await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains/${fqdn}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const guard = await requireExpert()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { expert, isAdmin } = guard
    const m = MSG[(expert.locale as string) === 'en' ? 'en' : 'pt']
    const body = await request.json() as { subdomain?: string }
    const newSubdomain = body.subdomain?.trim().toLowerCase()

    if (!newSubdomain || !SUBDOMAIN_REGEX.test(newSubdomain)) {
      return NextResponse.json({ error: m.invalid }, { status: 400 })
    }

    if (newSubdomain === expert.subdomain) {
      return NextResponse.json({ error: m.same }, { status: 400 })
    }

    // Cooldown check (admins can bypass)
    if (!isAdmin && expert.last_subdomain_change_at) {
      const elapsed = Date.now() - new Date(expert.last_subdomain_change_at as string).getTime()
      if (elapsed < COOLDOWN_MS) {
        const daysLeft = Math.ceil((COOLDOWN_MS - elapsed) / (1000 * 60 * 60 * 24))
        return NextResponse.json({ error: m.cooldown(daysLeft) }, { status: 429 })
      }
    }

    // Check availability
    const { data: existing } = await adminClient
      .from('experts')
      .select('id')
      .eq('subdomain', newSubdomain)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: m.taken }, { status: 409 })
    }

    // Add new domain on Vercel
    try {
      await addVercelDomain(newSubdomain)
    } catch (e) {
      if (e instanceof Error && e.message === '__rate_limit__') {
        return NextResponse.json({ error: m.vercel_rate_limit }, { status: 429 })
      }
      throw e
    }

    const now = new Date().toISOString()
    const oldSubdomain = expert.subdomain

    // Update DB
    const { error: updateError } = await adminClient
      .from('experts')
      .update({
        subdomain: newSubdomain,
        previous_subdomain: oldSubdomain,
        last_subdomain_change_at: now,
      })
      .eq('id', expert.id)

    if (updateError) {
      // Rollback Vercel domain
      await removeVercelDomain(newSubdomain).catch(() => null)
      throw new Error(updateError.message)
    }

    logger.info('painel/subdomain', 'Subdomínio alterado', {
      expertId: expert.id,
      from: oldSubdomain,
      to: newSubdomain,
    })

    const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')
    return NextResponse.json({
      subdomain: newSubdomain,
      panel_url: `https://${newSubdomain}.${appDomain}/painel`,
    })
  } catch (e) {
    logger.error('painel/subdomain', 'Erro ao alterar subdomínio', { error: e })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}
