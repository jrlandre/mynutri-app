'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import Stripe from 'stripe'
import ExpertWelcomeEmail from '@/emails/ExpertWelcomeEmail'
import { logger } from '@/lib/logger'

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
          logger.error('sudo', 'Erro ao cancelar assinatura Stripe', { error: err, expertId })
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

// ─── Demo experts ─────────────────────────────────────────────────────────────

export async function createDemoExpert(data: {
  name: string
  subdomain: string
}): Promise<void> {
  await checkAdmin()

  // Validação server-side
  const name = data.name.trim()
  if (!name || name.length < 2) throw new Error('Nome deve ter pelo menos 2 caracteres')

  const subdomain = data.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!subdomain || subdomain.length > 63 || /^-|-$/.test(subdomain)) {
    throw new Error('Subdomínio inválido')
  }

  const { data: existing } = await adminClient
    .from('experts')
    .select('id')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (existing) throw new Error('Subdomínio já em uso')

  // createUser não envia email (diferente de inviteUserByEmail)
  const dummyEmail = `demo-${subdomain}@internal.mynutri.pro`
  const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
    email: dummyEmail,
    email_confirm: true,
    user_metadata: { name },
  })

  if (userError) throw userError

  const { error: insertError } = await adminClient.from('experts').insert({
    user_id: userData.user.id,
    name,
    subdomain,
    plan: 'standard',
    active: true,
    listed: false,
    welcome_email_sent: true, // evita retry pelo cron
  })

  if (insertError) {
    try {
      await adminClient.auth.admin.deleteUser(userData.user.id)
    } catch (rollbackErr) {
      logger.error('sudo', 'Falha no rollback de auth user após erro de insert', { userId: userData.user.id, error: rollbackErr })
    }
    throw insertError
  }

  revalidatePath('/sudo')
}

export async function deleteExpert(expertId: string): Promise<void> {
  await checkAdmin()

  const { data: expert } = await adminClient
    .from('experts')
    .select('user_id, stripe_customer_id, lifetime')
    .eq('id', expertId)
    .maybeSingle()

  if (!expert) throw new Error('Expert não encontrado')
  if (expert.stripe_customer_id) throw new Error('Expert tem customer Stripe — não é possível deletar')
  if (expert.lifetime) throw new Error('Expert lifetime — não é possível deletar')

  // Verifica referrals (FK sem CASCADE bloquearia o delete silenciosamente)
  const { count: referralsCount } = await adminClient
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .or(`promoter_id.eq.${expertId},referred_expert_id.eq.${expertId}`)

  if ((referralsCount ?? 0) > 0) throw new Error('Expert tem referrals associados — não é possível deletar')

  const { count } = await adminClient
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('expert_id', expertId)
    .eq('active', true)

  if ((count ?? 0) > 0) throw new Error('Expert tem clientes ativos')

  // Limpa clientes pendentes/inativos antes de deletar
  const { error: clientsDeleteError } = await adminClient.from('clients').delete().eq('expert_id', expertId)
  if (clientsDeleteError) throw clientsDeleteError

  const { error: expertDeleteError } = await adminClient.from('experts').delete().eq('id', expertId)
  if (expertDeleteError) throw expertDeleteError

  // Deleta auth user apenas se não vinculado a outro expert
  if (expert.user_id) {
    const { count: others } = await adminClient
      .from('experts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', expert.user_id)

    if ((others ?? 0) === 0) {
      await adminClient.auth.admin.deleteUser(expert.user_id)
    }
  }

  revalidatePath('/sudo')
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
