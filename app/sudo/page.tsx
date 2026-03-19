import { adminClient } from '@/lib/supabase/admin'
import SudoClient from './SudoClient'
import type { Expert, Coupon } from '@/types'

export default async function SudoPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()

  const [
    { data: experts },
    { data: coupons },
    { data: clients },
    { data: usageToday },
  ] = await Promise.all([
    adminClient
      .from('experts')
      .select('id, name, subdomain, plan, active, is_admin, created_at')
      .order('created_at', { ascending: false }),
    adminClient
      .from('coupons')
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

  const clientCountByExpert: Record<string, number> = {}
  for (const c of clients ?? []) {
    if (!c.active) continue
    clientCountByExpert[c.expert_id] = (clientCountByExpert[c.expert_id] ?? 0) + 1
  }

  return (
    <SudoClient
      experts={(experts ?? []) as unknown as Expert[]}
      coupons={(coupons ?? []) as Coupon[]}
      clientCountByExpert={clientCountByExpert}
      totalActiveClients={clients?.filter(c => c.active).length ?? 0}
      usageTodayCount={usageToday?.length ?? 0}
    />
  )
}
