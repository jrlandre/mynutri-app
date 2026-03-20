import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
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
  const host = headersList.get('host') ?? ''
  const subdomain = extractSubdomain(host)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth?next=/painel')

  const { data: expert, error } = await adminClient
    .from('experts')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    // Se tiver subdomain, verifica que é o dono deste subdomínio específico
    .eq(subdomain ? 'subdomain' : 'active', subdomain ?? true)
    .maybeSingle()

  // Auto-populate photo from social login on first access
  if (expert && !expert.photo_url) {
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
    <PainelClient
      expert={expert as unknown as Expert}
      initialClients={(clients ?? []) as Client[]}
      initialReferrals={(referralsResult.data ?? []) as Referral[]}
    />
  )
}
