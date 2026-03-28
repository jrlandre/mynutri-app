import { NextRequest, NextResponse, after } from "next/server"
import { flushLogs } from "@/lib/axiom"
import Stripe from "stripe"
import { adminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import ExpertWelcomeEmail from "@/emails/ExpertWelcomeEmail"
import { logger } from "@/lib/logger"

// Rate limit — bloqueia flood antes da verificação de assinatura.
// 60/min é ~3x o pico legítimo do Stripe; retornar 429 dispara backoff exponencial no retry do Stripe.
async function buildWebhookRatelimit() {
  const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  if (!hasKV) return null
  const { Ratelimit } = await import("@upstash/ratelimit")
  const { kv } = await import("@vercel/kv")
  return new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "ratelimit_stripe_webhook_",
  })
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada")
  return new Stripe(key)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rl = await buildWebhookRatelimit()
  if (rl) {
    const { success } = await rl.limit("global")
    if (!success) {
      logger.warn('stripe/webhook', 'Rate limit atingido no webhook')
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }
  }

  const body = await request.text()
  const sig = request.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Assinatura ou segredo ausente." }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Assinatura inválida"
    logger.error('stripe/webhook', 'Falha na verificação de assinatura', { error: message })
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          (event.data as { previous_attributes?: Partial<Stripe.Subscription> }).previous_attributes
        )
        break
      case "invoice.payment_succeeded":
        await handleRecurringInvoice(event.data.object as Stripe.Invoice)
        break
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break
    }
  } catch (err) {
    logger.error('stripe/webhook', `Erro ao processar ${event.type}`, { error: err, eventId: event.id })
    return NextResponse.json({ error: "Erro interno no processamento." }, { status: 500 })
  }

  after(flushLogs())
  return NextResponse.json({ received: true })
}

// ─── getCurrentCommission ─────────────────────────────────────────────────────

async function getCurrentCommission(promoterId: string): Promise<number> {
  const now = new Date().toISOString()
  const { data } = await adminClient
    .from("commissions")
    .select("percentage")
    .eq("promoter_id", promoterId)
    .lte("valid_from", now)
    .or(`valid_until.is.null,valid_until.gt.${now}`)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.percentage ?? 20.00
}

// ─── buildReferralRecords ─────────────────────────────────────────────────────

async function buildReferralRecords({
  linkPromoter,
  couponPromoter,
  grossCents,
  referredExpertId,
  stripeInvoiceId,
  stripeSubscriptionId,
  clears_at,
}: {
  linkPromoter: { id: string } | null
  couponPromoter: { id: string } | null
  grossCents: number
  referredExpertId: string
  stripeInvoiceId: string | null
  stripeSubscriptionId: string | null
  clears_at: string
}) {
  const entries: Array<{ id: string; attr: string; multiplier: number }> = []

  if (linkPromoter && !couponPromoter) {
    entries.push({ id: linkPromoter.id, attr: "link", multiplier: 1 })
  } else if (!linkPromoter && couponPromoter) {
    entries.push({ id: couponPromoter.id, attr: "coupon", multiplier: 1 })
  } else if (linkPromoter && couponPromoter) {
    if (linkPromoter.id === couponPromoter.id) {
      entries.push({ id: linkPromoter.id, attr: "link_and_coupon", multiplier: 1 })
    } else {
      entries.push({ id: linkPromoter.id, attr: "link_split", multiplier: 0.5 })
      entries.push({ id: couponPromoter.id, attr: "coupon_split", multiplier: 0.5 })
    }
  }

  const rows = []
  for (const entry of entries) {
    const pct = await getCurrentCommission(entry.id)
    const effectivePct = pct * entry.multiplier
    const commissionCents = Math.floor(grossCents * effectivePct / 100)
    rows.push({
      promoter_id: entry.id,
      referred_expert_id: referredExpertId,
      stripe_invoice_id: stripeInvoiceId,
      stripe_subscription_id: stripeSubscriptionId,
      amount_gross_cents: grossCents,
      commission_pct: effectivePct,
      commission_cents: commissionCents,
      attribution: entry.attr,
      status: "pending",
      clears_at,
    })
  }
  return rows
}

// ─── createReferralRecords ────────────────────────────────────────────────────

async function createReferralRecords(
  session: Stripe.Checkout.Session,
  referredExpertId: string
) {
  const refCode = session.metadata?.ref_code
  let linkPromoter: { id: string } | null = null
  if (refCode) {
    const { data } = await adminClient
      .from("experts")
      .select("id")
      .eq("referral_code", refCode)
      .eq("is_promoter", true)
      .eq("active", true)
      .maybeSingle()
    linkPromoter = data
  }

  let couponPromoter: { id: string } | null = null
  // session.discounts está disponível sem expansão no evento do webhook
  const sessionDiscount = session.discounts?.[0]
  const sessionCoupon = sessionDiscount?.coupon
  const appliedCouponId = sessionCoupon
    ? (typeof sessionCoupon === 'string' ? sessionCoupon : sessionCoupon.id)
    : undefined
  if (appliedCouponId) {
    const { data } = await adminClient
      .from("experts")
      .select("id")
      .eq("stripe_coupon_id", appliedCouponId)
      .eq("is_promoter", true)
      .eq("active", true)
      .maybeSingle()
    couponPromoter = data
  }

  if (!linkPromoter && !couponPromoter) return

  const grossCents = session.amount_total ?? 0
  const clears_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const stripeInvoiceId = typeof session.invoice === "string" ? session.invoice : null
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null

  const records = await buildReferralRecords({
    linkPromoter,
    couponPromoter,
    grossCents,
    referredExpertId,
    stripeInvoiceId,
    stripeSubscriptionId,
    clears_at,
  })

  if (records.length > 0) {
    await adminClient.from("referrals").insert(records)
  }
}

// ─── handleCheckoutCompleted ──────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { subdomain, name, email } = session.metadata ?? {}
  const stripe_customer_id = typeof session.customer === "string" ? session.customer : null
  const stripe_subscription_id = typeof session.subscription === "string" ? session.subscription : null

  const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/
  if (!subdomain || !name || !email || !SUBDOMAIN_REGEX.test(subdomain)) {
    logger.error('stripe/webhook', 'Metadata inválida no checkout.session.completed', { metadata: session.metadata, sessionId: session.id })
    return
  }

  // Idempotência: evento já processado se expert com esse subdomain existir
  const { data: existingExpert } = await adminClient
    .from("experts")
    .select("id")
    .eq("subdomain", subdomain)
    .maybeSingle()
  if (existingExpert) {
    logger.info('stripe/webhook', 'Expert já existe — evento duplicado, ignorando', { subdomain, sessionId: session.id })
    return
  }

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")
  const panelUrl = `https://${subdomain}.${appDomain}/painel?tab=exibicao`

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: { name },
      redirectTo: panelUrl,
    }
  )

  let userId: string
  if (inviteError) {
    // Fallback: usuário já existe — buscar pelo email via RPC
    const { data: existingId } = await adminClient.rpc("get_user_id_by_email", { p_email: email })
    if (!existingId) {
      logger.error('stripe/webhook', 'Erro ao criar usuário via invite', { error: inviteError.message, email })
      throw inviteError
    }
    logger.info('stripe/webhook', 'Usuário já existe — vinculando expert ao userId existente', { email })
    userId = existingId as string
  } else {
    userId = inviteData.user.id
  }

  // Detect subscription period
  let subscription_period: "monthly" | "yearly" | null = null
  if (stripe_subscription_id) {
    try {
      const stripe = getStripe()
      const sub = await stripe.subscriptions.retrieve(stripe_subscription_id, {
        expand: ["items.data.price"],
      })
      const interval = sub.items.data[0]?.price?.recurring?.interval
      if (interval === "month") subscription_period = "monthly"
      else if (interval === "year") subscription_period = "yearly"
    } catch {
      // non-critical
    }
  }

  const { error: insertError } = await adminClient
    .from("experts")
    .insert({
      user_id: userId,
      subdomain,
      name,
      stripe_customer_id,
      stripe_subscription_id,
      active: true,
      plan: "standard",
      subscription_period,
    })

  if (insertError) {
    logger.error('stripe/webhook', 'Erro ao inserir expert', { error: insertError.message, subdomain, email })
    throw insertError
  }

  logger.info('stripe/webhook', 'Expert criado com sucesso', { subdomain, email })

  // Referral attribution — usar subdomain (único) para garantir o expert correto
  const { data: newExpert } = await adminClient
    .from("experts")
    .select("id")
    .eq("subdomain", subdomain)
    .maybeSingle()

  if (newExpert) {
    try {
      await createReferralRecords(session, newExpert.id)
    } catch (err) {
      logger.error('stripe/webhook', 'Falha ao criar referral records', { error: err, subdomain })
    }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "MyNutri <noreply@mynutri.pro>",
        to: email,
        subject: `Boas-vindas ao MyNutri, ${name.split(" ")[0]}!`,
        react: ExpertWelcomeEmail({ name, panelUrl }),
      })

      await adminClient
        .from("experts")
        .update({ welcome_email_sent: true })
        .eq("subdomain", subdomain)
    } catch (err) {
      logger.error('stripe/webhook', 'Falha ao enviar email de boas-vindas', { error: err, email, subdomain })
    }
  }
}

// ─── handleSubscriptionDeleted ────────────────────────────────────────────────

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Experts lifetime não são desativados por cancelamento de assinatura Stripe
  const { error } = await adminClient
    .from("experts")
    .update({ active: false })
    .eq("stripe_subscription_id", subscription.id)
    .eq("lifetime", false)

  if (error) {
    logger.error('stripe/webhook', 'Erro ao desativar expert na deleção de assinatura', { error: error.message, subscriptionId: subscription.id })
    throw error
  }

  logger.info('stripe/webhook', 'Assinatura cancelada — expert desativado', { subscriptionId: subscription.id })
}

// ─── handleSubscriptionUpdated ───────────────────────────────────────────────

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  previousAttributes?: Partial<Stripe.Subscription>
) {
  const { status } = subscription
  const previousStatus = previousAttributes?.status

  if (status === "active" && (previousStatus === "past_due" || previousStatus === "unpaid")) {
    // Pagamento recuperado após inadimplência — reativa apenas se estava inativo
    // Checar previousStatus evita reativar experts banidos manualmente pelo admin
    // quando o Stripe dispara updates de rotina (renovação, atualização de cartão, etc.)
    const { error } = await adminClient
      .from("experts")
      .update({ active: true })
      .eq("stripe_subscription_id", subscription.id)
      .eq("active", false)
    if (error) logger.error('stripe/webhook', 'Erro ao reativar expert', { error: error.message, subscriptionId: subscription.id })
    else logger.info('stripe/webhook', 'Expert reativado após recuperação de pagamento', { previousStatus, subscriptionId: subscription.id })
  } else if (status === "unpaid" || status === "incomplete_expired") {
    // Stripe esgotou as tentativas — desativa (exceto lifetime)
    const { error } = await adminClient
      .from("experts")
      .update({ active: false })
      .eq("stripe_subscription_id", subscription.id)
      .eq("lifetime", false)
    if (error) logger.error('stripe/webhook', 'Erro ao desativar expert por inadimplência', { error: error.message, status, subscriptionId: subscription.id })
    else logger.info('stripe/webhook', 'Expert desativado por inadimplência', { status, subscriptionId: subscription.id })
  }
  // past_due: Stripe ainda está tentando cobrar — mantém ativo
  // canceled: coberto por customer.subscription.deleted
}

// ─── handlePaymentFailed ──────────────────────────────────────────────────────

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Só notifica na primeira tentativa — Stripe pode tentar várias vezes
  if ((invoice.attempt_count ?? 0) !== 1) return

  const rawSub = invoice.parent?.subscription_details?.subscription
  const subscriptionId = typeof rawSub === "string" ? rawSub : null
  if (!subscriptionId) return

  const { data: expert } = await adminClient
    .from("experts")
    .select("id, name, user_id, subdomain, stripe_customer_id, lifetime")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle()

  if (!expert?.user_id) return
  if (expert.lifetime) return  // lifetime: sem cobranças, sem emails de falha

  const { data: userData } = await adminClient.auth.admin.getUserById(expert.user_id)
  const email = userData.user?.email
  if (!email || !process.env.RESEND_API_KEY) return

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")
  const panelUrl = `https://${expert.subdomain}.${appDomain}/painel`

  // Gera link direto para o Billing Portal para facilitar atualização de cartão
  let billingUrl = panelUrl
  if (expert.stripe_customer_id) {
    try {
      const stripe = getStripe()
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: expert.stripe_customer_id,
        return_url: panelUrl,
      })
      billingUrl = portalSession.url
    } catch {
      // fallback para o painel
    }
  }

  const firstName = expert.name.split(" ")[0]
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "MyNutri <noreply@mynutri.pro>",
    to: email,
    subject: `Problema com seu pagamento no MyNutri`,
    html: `
      <p>Olá, ${firstName}.</p>
      <p>Identificamos um problema ao processar o pagamento da sua assinatura MyNutri.</p>
      <p>Para continuar usando sua conta sem interrupções, atualize seu método de pagamento:</p>
      <p>
        <a href="${billingUrl}"
           style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">
          Atualizar forma de pagamento
        </a>
      </p>
      <p>Tentaremos processar o pagamento novamente em breve.</p>
      <p>— Equipe MyNutri</p>
    `,
  })

  logger.info('stripe/webhook', 'Email de pagamento falho enviado', { email, expertId: expert.id })
}

// ─── handleChargeRefunded ─────────────────────────────────────────────────────

async function handleChargeRefunded(charge: Stripe.Charge) {
  // Apenas reembolso total — reembolsos parciais não cancelam comissões
  if (charge.amount_refunded < charge.amount) return

  // `invoice` existe no objeto runtime mas foi removido dos tipos do SDK
  const invoiceField = (charge as unknown as { invoice?: unknown }).invoice
  const invoiceId = typeof invoiceField === "string" ? invoiceField : null
  if (!invoiceId) return

  // Cancela comissões pendentes/já liberadas para não pagar sobre cobrança estornada
  const { error } = await adminClient
    .from("referrals")
    .update({ status: "refunded" })
    .eq("stripe_invoice_id", invoiceId)
    .in("status", ["pending", "cleared"])

  if (error) {
    logger.error('stripe/webhook', 'Erro ao marcar referrals como refunded', { error: error.message, invoiceId })
  } else {
    logger.info('stripe/webhook', 'Referrals marcados como refunded', { invoiceId })
  }
}

// ─── handleRecurringInvoice ───────────────────────────────────────────────────

async function handleRecurringInvoice(invoice: Stripe.Invoice) {
  if (invoice.billing_reason === "subscription_create") return

  const rawSub = invoice.parent?.subscription_details?.subscription
  const subscriptionId = typeof rawSub === "string" ? rawSub : null
  if (!subscriptionId) return

  const { data: expert } = await adminClient
    .from("experts")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("active", true)
    .maybeSingle()

  if (!expert) return

  // Idempotência: já existe referral para esta invoice?
  const { data: alreadyRecorded } = await adminClient
    .from("referrals")
    .select("id")
    .eq("stripe_invoice_id", invoice.id)
    .limit(1)
    .maybeSingle()
  if (alreadyRecorded) return

  const { data: prev } = await adminClient
    .from("referrals")
    .select("promoter_id, attribution, commission_pct")
    .eq("stripe_subscription_id", subscriptionId)
    .order("created_at", { ascending: false })
    .limit(2)

  if (!prev || prev.length === 0) return

  const grossCents = invoice.amount_paid
  const clears_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const newRecords = await Promise.all(
    prev.map(async (r) => {
      const pct = await getCurrentCommission(r.promoter_id)
      return {
        promoter_id: r.promoter_id,
        referred_expert_id: expert.id,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: subscriptionId,
        amount_gross_cents: grossCents,
        commission_pct: pct,
        commission_cents: Math.floor(grossCents * pct / 100),
        attribution: r.attribution,
        status: "pending",
        clears_at,
      }
    })
  )

  await adminClient.from("referrals").insert(newRecords)
}
