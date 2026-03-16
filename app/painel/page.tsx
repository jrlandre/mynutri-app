import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import PainelClient from './PainelClient'
import type { Nutritionist, Patient } from '@/types'

function extractSubdomain(host: string): string | null {
  // dev override
  if (process.env.PAINEL_DEV_SUBDOMAIN) return process.env.PAINEL_DEV_SUBDOMAIN
  const match = host.match(/^([^.]+)\./)
  const sub = match?.[1]
  // Ignorar hosts sem subdomain real (ex: localhost, mynutri-one)
  if (!sub || sub === 'www' || sub === 'mynutri-one' || sub === 'localhost') return null
  return sub
}

export default async function PainelPage() {
  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const subdomain = extractSubdomain(host)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth?next=/painel')

  const { data: nutritionist, error } = await adminClient
    .from('nutritionists')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    // Se tiver subdomain, verifica que é o dono deste subdomínio específico
    .eq(subdomain ? 'subdomain' : 'active', subdomain ?? true)
    .maybeSingle()

  if (error || !nutritionist) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <div className="text-center flex flex-col gap-2 max-w-sm">
          <p className="text-lg font-semibold">Acesso negado</p>
          <p className="text-sm text-muted-foreground">
            Sua conta não está associada a este painel.
          </p>
        </div>
      </main>
    )
  }

  const { data: patients } = await adminClient
    .from('patients')
    .select('id, user_id, email, active, invited_at, activated_at')
    .eq('nutritionist_id', nutritionist.id)
    .order('invited_at', { ascending: false })

  return (
    <PainelClient
      nutritionist={nutritionist as Nutritionist}
      initialPatients={(patients ?? []) as Patient[]}
    />
  )
}
