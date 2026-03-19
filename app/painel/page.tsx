import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import PainelClient from './PainelClient'
import type { Expert, Client } from '@/types'

function extractSubdomain(host: string): string | null {
  // dev override
  if (process.env.PAINEL_DEV_SUBDOMAIN) return process.env.PAINEL_DEV_SUBDOMAIN
  const match = host.match(/^([^.]+)\./)
  const sub = match?.[1]
  // Ignorar hosts sem subdomain real (ex: localhost, relapro.app)
  if (!sub || sub === 'www' || sub === 'localhost') return null
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

  const { data: clients } = await adminClient
    .from('clients')
    .select('id, user_id, email, active, invited_at, activated_at')
    .eq('expert_id', expert.id)
    .order('invited_at', { ascending: false })

  return (
    <PainelClient
      expert={expert as Expert}
      initialClients={(clients ?? []) as Client[]}
    />
  )
}
