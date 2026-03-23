'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import Stripe from 'stripe'
import ExpertWelcomeEmail from '@/emails/ExpertWelcomeEmail'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await adminClient
    .from('experts')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) throw new Error('Acesso negado: Requer privilégios Sudo')
}

// ─── Existing actions ─────────────────────────────────────────────────────────

export async function toggleExpertStatus(expertId: string, newStatus: boolean) {
  await checkAdmin()

  if (!newStatus) {
    // Desativando: cancela assinatura no Stripe para evitar cobranças futuras
    const { data: expert } = await adminClient
      .from('experts')
      .select('stripe_subscription_id')
      .eq('id', expertId)
      .maybeSingle()

    if (expert?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      try {
        await stripe.subscriptions.cancel(expert.stripe_subscription_id)
      } catch (err: unknown) {
        // Ignora erro se assinatura já estava cancelada (status 404 ou resource_missing)
        const stripeErr = err as { code?: string; statusCode?: number }
        const alreadyCanceled = stripeErr?.code === 'resource_missing' || stripeErr?.statusCode === 404
        if (!alreadyCanceled) {
          console.error('[sudo] Erro ao cancelar assinatura Stripe:', err)
          throw new Error('Falha ao cancelar assinatura no Stripe. Tente novamente ou cancele diretamente no painel Stripe.')
        }
      }
    }
  }

  await adminClient.from('experts').update({ active: newStatus }).eq('id', expertId)
  revalidatePath('/sudo')
}

export async function changeExpertPlan(expertId: string, newPlan: 'standard' | 'enterprise') {
  await checkAdmin()
  await adminClient.from('experts').update({ plan: newPlan }).eq('id', expertId)
  revalidatePath('/sudo')
}

// ─── Impersonation ────────────────────────────────────────────────────────────

export async function generateImpersonationLink(expertId: string): Promise<string> {
  await checkAdmin()

  const { data: expert } = await adminClient
    .from('experts')
    .select('user_id, subdomain')
    .eq('id', expertId)
    .maybeSingle()

  if (!expert?.user_id) throw new Error('Expert não encontrado')

  const { data: userData } = await adminClient.auth.admin.getUserById(expert.user_id)
  if (!userData.user?.email) throw new Error('Email do usuário não encontrado')

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const redirectTo = `https://${expert.subdomain}.${appDomain}/auth/callback?next=/painel`

  const { data } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
    options: { redirectTo },
  })

  if (!data?.properties?.action_link) throw new Error('Link de impersonation não gerado')
  return data.properties.action_link
}

// ─── Reenviar boas-vindas ─────────────────────────────────────────────────────

export async function resendWelcomeEmail(expertId: string): Promise<void> {
  await checkAdmin()

  if (!process.env.RESEND_API_KEY) throw new Error('Resend API key ausente')

  const { data: expert } = await adminClient
    .from('experts')
    .select('user_id, subdomain, name')
    .eq('id', expertId)
    .maybeSingle()

  if (!expert?.user_id) throw new Error('Expert não encontrado')

  const { data: userData } = await adminClient.auth.admin.getUserById(expert.user_id)
  const email = userData.user?.email
  if (!email) throw new Error('Email não encontrado')

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const panelUrl = `https://${expert.subdomain}.${appDomain}/painel`

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'MyNutri <noreply@mynutri.pro>',
    to: email,
    subject: `Boas-vindas ao MyNutri, ${expert.name.split(' ')[0]}!`,
    react: ExpertWelcomeEmail({ name: expert.name, panelUrl }),
  })

  await adminClient
    .from('experts')
    .update({ welcome_email_sent: true })
    .eq('id', expertId)

  revalidatePath('/sudo')
}

// ─── Criar expert sem billing ─────────────────────────────────────────────────

export async function createExpertBypass(data: {
  email: string
  name: string
  subdomain: string
  plan: 'standard' | 'enterprise'
}): Promise<void> {
  await checkAdmin()

  const { data: existing } = await adminClient
    .from('experts')
    .select('id')
    .eq('subdomain', data.subdomain)
    .maybeSingle()

  if (existing) throw new Error('Subdomínio já em uso')

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    data.email,
    { data: { name: data.name } }
  )

  if (inviteError) throw inviteError

  const { error: insertError } = await adminClient.from('experts').insert({
    user_id: inviteData.user.id,
    name: data.name,
    subdomain: data.subdomain,
    plan: data.plan,
    active: true,
  })

  if (insertError) throw insertError

  revalidatePath('/sudo')
}

// ─── Promoters — configurar comissão ─────────────────────────────────────────

export async function setCommission(
  promoterId: string,
  percentage: number,
  valid_from: string,
  valid_until?: string
): Promise<void> {
  await checkAdmin()

  if (percentage <= 0 || percentage > 100) throw new Error('Percentual fora do intervalo permitido')

  const { error } = await adminClient.from('commissions').insert({
    promoter_id: promoterId,
    percentage,
    valid_from,
    valid_until: valid_until ?? null,
  })

  if (error) throw error

  revalidatePath('/sudo')
}

// ─── Promoters — marcar como pago ────────────────────────────────────────────

export async function markReferralsPaid(promoterId: string): Promise<void> {
  await checkAdmin()

  const { error } = await adminClient
    .from('referrals')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('promoter_id', promoterId)
    .eq('status', 'cleared')

  if (error) throw error

  revalidatePath('/sudo')
}

// ─── Promoters — ativar/desativar e definir referral_code ────────────────────

export async function setPromoterStatus(
  expertId: string,
  isPromoter: boolean,
  referralCode?: string
): Promise<void> {
  await checkAdmin()

  const update: Record<string, unknown> = { is_promoter: isPromoter }
  if (referralCode !== undefined) {
    update.referral_code = referralCode || null
  }

  const { error } = await adminClient
    .from('experts')
    .update(update)
    .eq('id', expertId)

  if (error) throw error

  revalidatePath('/sudo')
}

// ─── Cupons — criar no Stripe ─────────────────────────────────────────────────

export async function createStripeCoupon(data: {
  code: string
  percentOff: number
  duration: 'once' | 'repeating' | 'forever'
  durationMonths?: number
}): Promise<{ couponId: string; promotionCodeId: string }> {
  await checkAdmin()

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) throw new Error('Stripe não configurado')

  const stripe = new Stripe(stripeKey)

  const coupon = await stripe.coupons.create({
    percent_off: data.percentOff,
    duration: data.duration,
    duration_in_months: data.durationMonths,
  })

  const promoCode = await stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: coupon.id },
    code: data.code,
  })

  return { couponId: coupon.id, promotionCodeId: promoCode.id }
}

// ─── Cupons — associar a promoter ────────────────────────────────────────────

export async function associateCouponToPromoter(
  expertId: string,
  stripeCouponId: string
): Promise<void> {
  await checkAdmin()

  const { error } = await adminClient
    .from('experts')
    .update({ stripe_coupon_id: stripeCouponId || null })
    .eq('id', expertId)

  if (error) throw error

  revalidatePath('/sudo')
}
