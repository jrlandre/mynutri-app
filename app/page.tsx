import { headers } from 'next/headers'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import HomeClient from "@/components/HomeClient"
import type { UserProfile } from "@/types"

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
    if (data) tenantSubdomain = subdomain
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
        .select('id, is_admin')
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
      hasPanel,
      isSudo: expert?.is_admin === true,
    }
  }

  return <HomeClient tenantSubdomain={tenantSubdomain} userProfile={userProfile} />
}
