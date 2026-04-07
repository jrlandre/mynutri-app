import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { adminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import HomeClient from "@/components/HomeClient"
import type { UserProfile } from "@/types"

export const metadata: Metadata = {
  robots: { index: false },
}

export default async function SubdomainPage({
  params,
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params

  const { data } = await adminClient
    .from("experts")
    .select("id")
    .eq("subdomain", subdomain)
    .eq("active", true)
    .maybeSingle()

  if (!data) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const appDomain = appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (appDomain && !appDomain.includes('localhost')) {
    const protocol = appUrl.startsWith('https') ? 'https' : 'http'
    redirect(`${protocol}://${subdomain}.${appDomain}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userProfile: UserProfile | null = null
  if (user && user.email) {
    let expertName = null
    let hasPanel = false

    const [{ data: client }, { data: expert }] = await Promise.all([
      adminClient
        .from('clients')
        .select('experts(name)')
        .eq('user_id', user.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle(),
      adminClient
        .from('experts')
        .select('id')
        .eq('user_id', user.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle()
    ])

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
      hasPanel
    }
  }

  return <HomeClient tenantSubdomain={subdomain} userProfile={userProfile} />
}
