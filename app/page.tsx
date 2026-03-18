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
      .from('nutritionists')
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
    let nutritionistName = null
    let hasPanel = false

    const [{ data: patient }, { data: nutritionist }] = await Promise.all([
      adminClient
        .from('patients')
        .select('nutritionists(name)')
        .eq('user_id', user.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle(),
      adminClient
        .from('nutritionists')
        .select('id')
        .eq('user_id', user.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle()
    ])

    if (nutritionist) {
      hasPanel = true
    }
      
    if (patient?.nutritionists) {
      nutritionistName = Array.isArray(patient.nutritionists) 
        ? patient.nutritionists[0]?.name 
        : (patient.nutritionists as { name?: string })?.name
    }
    
    userProfile = {
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      nutritionistName,
      hasPanel
    }
  }

  return <HomeClient tenantSubdomain={tenantSubdomain} userProfile={userProfile} />
}
