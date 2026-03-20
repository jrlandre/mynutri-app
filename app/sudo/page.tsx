import { adminClient } from '@/lib/supabase/admin'
import SudoClient from './SudoClient'
import type { Expert, ContactLink } from '@/types'

export default async function SudoPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()

  const [
    { data: expertsData },
    { data: clients },
    { data: usageToday },
  ] = await Promise.all([
    adminClient
      .from('experts')
      .select('*')
      .order('created_at', { ascending: false }),
    adminClient
      .from('clients')
      .select('id, expert_id, active'),
    adminClient
      .from('usage')
      .select('id')
      .gte('created_at', todayStart),
  ])

  const experts: Expert[] = (expertsData ?? []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    subdomain: row.subdomain,
    name: row.name,
    specialty: row.specialty,
    city: row.city,
    photo_url: row.photo_url,
    contact_links: Array.isArray(row.contact_links) 
      ? row.contact_links.filter((link): link is { type: string, label: string, url: string } => 
          typeof link === 'object' && link !== null && 'type' in link && 'label' in link && 'url' in link
        ) as ContactLink[]
      : [],
    listed: row.listed,
    system_prompt: row.system_prompt,
    plan: row.plan,
    active: row.active,
    is_admin: row.is_admin
  }))

  const clientCountByExpert: Record<string, number> = {}
  for (const c of clients ?? []) {
    if (!c.active) continue
    clientCountByExpert[c.expert_id] = (clientCountByExpert[c.expert_id] ?? 0) + 1
  }

  return (
    <SudoClient
      experts={experts}
      clientCountByExpert={clientCountByExpert}
      totalActiveClients={clients?.filter(c => c.active).length ?? 0}
      usageTodayCount={usageToday?.length ?? 0}
    />
  )
}
