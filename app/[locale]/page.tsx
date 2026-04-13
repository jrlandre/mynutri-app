import { Suspense } from 'react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import HomeClient from "@/components/HomeClient"
import { SubdomainNotFoundToast } from '@/components/SubdomainNotFoundToast'
import type { UserProfile } from "@/types"

export const metadata: Metadata = {
  title: 'MyNutri — Assistente nutricional com IA',
  description: 'A IA que aplica o método do seu nutricionista. Respostas certas 24h, com o protocolo do seu expert.',
  robots: { index: false, follow: false },
}

export default async function Home() {
  const host = (await headers()).get('host') ?? ''
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const match = appDomain ? host.match(new RegExp(`^([^.]+)\\.${appDomain.replace(/\./g, '\\.')}$`)) : null
  const subdomain = match?.[1] ?? null

  let tenantSubdomain: string | undefined
  if (subdomain && subdomain !== 'www') {
    const { data } = await adminClient
      .from('experts')
      .select('id')
      .eq('subdomain', subdomain)
      .eq('active', true)
      .maybeSingle()
    if (data) {
      tenantSubdomain = subdomain
    } else {
      redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?subdomain_not_found=1`)
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userProfile: UserProfile | null = null
  if (user && user.email) {
    let expertName = null
    let hasPanel = false

    const expertQuery = adminClient
      .from('experts')
      .select('id, photo_url, subdomain')
      .eq('user_id', user.id)
      .eq('active', true)

    const [{ data: client }, { data: expert }, { data: adminCheck }] = await Promise.all([
      adminClient
        .from('clients')
        .select('experts(name, subdomain)')
        .eq('user_id', user.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle(),
      expertQuery.limit(1).maybeSingle(),
      adminClient
        .from('experts')
        .select('is_admin')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    // Redirecionar usuários logados no main domain para o subdomain correto
    if (!subdomain && appDomain && adminCheck?.is_admin !== true) {
      if (expert?.subdomain) {
        redirect(`https://${expert.subdomain}.${appDomain}/`)
      } else {
        const clientExpertSub = Array.isArray(client?.experts)
          ? client?.experts[0]?.subdomain
          : (client?.experts as { subdomain?: string } | null)?.subdomain
        if (clientExpertSub) {
          redirect(`https://${clientExpertSub}.${appDomain}/`)
        }
      }
    }

    if (expert) {
      hasPanel = true
    }

    if (client?.experts) {
      expertName = Array.isArray(client.experts)
        ? client.experts[0]?.name
        : (client.experts as { name?: string })?.name
    }

    userProfile = {
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      expertName,
      hasPanel,
      isSudo: adminCheck?.is_admin === true,
      photoUrl: expert?.photo_url ?? null,
    }
  }

  return (
    <>
      <Suspense><SubdomainNotFoundToast /></Suspense>
      <HomeClient tenantSubdomain={tenantSubdomain} userProfile={userProfile} />
    </>
  )
}
