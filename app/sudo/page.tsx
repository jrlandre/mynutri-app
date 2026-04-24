import Stripe from 'stripe'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import SudoClient from './SudoClient'
import type { Expert, ContactLink } from '@/types'

export default async function SudoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Verifica se é sudo (is_admin na tabela experts)
  const { data: profile } = await adminClient
    .from('experts')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    redirect('/')
  }

  const today = new Date()
  const todayDate = today.toISOString().split('T')[0]

  const [
    { data: expertsData },
    { data: clients },
    { data: usageToday },
    { data: promotersData },
    { data: allReferrals },
    { data: pendingCommissions },
    { data: allUsage },
  ] = await Promise.all([
    adminClient
      .from('experts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
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
    adminClient
      .from('usage')
      .select('analysis_count'),
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
        expand: ['data.items.data.price', 'data.discount'],
      }).autoPagingToArray(10000)
      mrrCents = subs.reduce((sum, sub) => {
        const item = sub.items.data[0]
        let amount = item.price.unit_amount ?? 0

        if (sub.discount?.coupon) {
          if (sub.discount.coupon.percent_off) {
            amount = amount * (1 - sub.discount.coupon.percent_off / 100)
          } else if (sub.discount.coupon.amount_off) {
            amount = Math.max(0, amount - sub.discount.coupon.amount_off)
          }
        }

        const interval = item.price.recurring?.interval
        return sum + (interval === 'year' ? Math.round(amount / 12) : Math.round(amount))
      }, 0)
    }
  } catch {
    // non-critical
  }

  const totalToPayCents = pendingCommissions?.reduce((s, r) => s + r.commission_cents, 0) ?? 0
  const totalAnalyses = allUsage?.reduce((sum, r) => sum + r.analysis_count, 0) ?? 0

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
      totalAnalyses={totalAnalyses}
      mrrCents={mrrCents}
      totalToPayCents={totalToPayCents}
      promoters={promotersData ?? []}
      allReferrals={allReferrals ?? []}
    />
  )
}
