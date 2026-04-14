import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { NextIntlClientProvider } from 'next-intl'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import PainelClient from './PainelClient'
import type { Expert, Client, Referral } from '@/types'

function extractSubdomain(host: string): string | null {
  // dev override
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

export default async function PainelPage() {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const subdomain = extractSubdomain(host)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth?next=/painel')

  // Verifica se o usuário logado é Admin (is_admin = true)
  const { data: adminCheck } = await adminClient
    .from('experts')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = adminCheck?.is_admin === true

  let query = adminClient
    .from('experts')
    .select('*')
    .eq('active', true)

  if (!isAdmin || !subdomain) {
    query = query.eq('user_id', user.id)
  }

  // Se tiver subdomain (sempre vai ter em produção), filtra para pegar o painel correto
  if (subdomain) {
    query = query.eq('subdomain', subdomain)
  }

  const { data: expert, error } = await query.limit(1).maybeSingle()

  // Auto-populate photo from social login on first access (somente se ele for o dono do painel)
  if (expert && !expert.photo_url && expert.user_id === user.id) {
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture
    if (avatarUrl) {
      await adminClient.from('experts').update({ photo_url: avatarUrl }).eq('id', expert.id)
      expert.photo_url = avatarUrl
    }
  }

  if (error || !expert) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-center flex flex-col gap-2 max-w-sm">
          <p className="text-lg font-semibold">Acesso negado</p>
          <p className="text-sm text-muted-foreground">
            Sua conta não está associada a este painel.
          </p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
          Voltar
        </Link>
      </main>
    )
  }

  const expertLocale: 'pt' | 'en' = ((expert as Record<string, unknown>).locale as string) === 'en' ? 'en' : 'pt'
  const messages = (await import(`@/messages/${expertLocale}.json`)).default

  const [{ data: clients }, referralsResult] = await Promise.all([
    adminClient
      .from('clients')
      .select('id, user_id, email, active, invited_at, activated_at')
      .eq('expert_id', expert.id)
      .order('invited_at', { ascending: false }),
    expert.is_promoter
      ? adminClient
          .from('referrals')
          .select('*')
          .eq('promoter_id', expert.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: null, error: null }),
  ])

  return (
    <Suspense>
      <NextIntlClientProvider locale={expertLocale} messages={messages}>
        <PainelClient
          expert={expert as unknown as Expert}
          initialClients={(clients ?? []) as Client[]}
          initialReferrals={(referralsResult.data ?? []) as Referral[]}
        />
      </NextIntlClientProvider>
    </Suspense>
  )
}
