import Stripe from 'stripe'
import { adminClient } from '@/lib/supabase/admin'
import SudoClient from './SudoClient'
import type { Expert, ContactLink } from '@/types'

export default async function SudoPage() {
  const today = new Date()
  const todayDate = today.toISOString().split('T')[0]

  const [
    { data: expertsData },
    { data: clients },
    { data: usageToday },
    { data: promotersData },
    { data: allReferrals },
    { data: pendingCommissions },
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
      .select('analysis_count')
      .eq('date', todayDate),
    adminClient
      .from('experts')
      .select('id, name, referral_code, stripe_coupon_id, commissions(percentage, valid_from, valid_until)')
      .eq('is_promoter', true)
      .eq('active', true),
    adminClient
      .from('referrals')
      .select('promoter_id, commission_cents, status'),
    adminClient
      .from('referrals')
      .select('commission_cents')
      .eq('status', 'cleared'),
  ])

  // MRR from Stripe
  let mrrCents = 0
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (stripeKey) {
      const stripe = new Stripe(stripeKey)
      const subs = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        expand: ['data.items.data.price'],
      })
      mrrCents = subs.data.reduce((sum, sub) => {
        const item = sub.items.data[0]
        const amount = item.price.unit_amount ?? 0
        const interval = item.price.recurring?.interval
        return sum + (interval === 'year' ? Math.round(amount / 12) : amount)
      }, 0)
    }
  } catch {
    // non-critical
  }

  const totalToPayCents = pendingCommissions?.reduce((s, r) => s + r.commission_cents, 0) ?? 0

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
    plan: row.plan as 'standard' | 'enterprise',
    lifetime: row.lifetime ?? false,
    active: row.active,
    is_admin: row.is_admin,
    is_promoter: row.is_promoter,
    referral_code: row.referral_code,
    stripe_coupon_id: row.stripe_coupon_id,
    stripe_customer_id: row.stripe_customer_id,
  }))

  const clientCountByExpert: Record<string, number> = {}
  for (const c of clients ?? []) {
    if (!c.active || !c.expert_id) continue
    clientCountByExpert[c.expert_id] = (clientCountByExpert[c.expert_id] ?? 0) + 1
  }

  return (
    <SudoClient
      experts={experts}
      clientCountByExpert={clientCountByExpert}
      totalActiveClients={clients?.filter(c => c.active).length ?? 0}
      usageTodayCount={usageToday?.reduce((sum, r) => sum + r.analysis_count, 0) ?? 0}
      mrrCents={mrrCents}
      totalToPayCents={totalToPayCents}
      promoters={promotersData ?? []}
      allReferrals={allReferrals ?? []}
    />
  )
}
