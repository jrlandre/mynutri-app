import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import ExpertWelcomeEmail from "@/emails/ExpertWelcomeEmail"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada")
  return new Stripe(key)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
    console.error("[stripe/webhook] Falha na verificação:", message)
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
      case "invoice.payment_succeeded":
        await handleRecurringInvoice(event.data.object as Stripe.Invoice)
        break
    }
  } catch (err) {
    console.error(`[stripe/webhook] Erro ao processar ${event.type}:`, err)
    return NextResponse.json({ error: "Erro interno no processamento." }, { status: 500 })
  }

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
    console.error("[stripe/webhook] Metadata inválida:", session.metadata)
    return
  }

  // Idempotência: evento já processado se expert com esse subdomain existir
  const { data: existingExpert } = await adminClient
    .from("experts")
    .select("id")
    .eq("subdomain", subdomain)
    .maybeSingle()
  if (existingExpert) {
    console.log(`[stripe/webhook] Expert ${subdomain} já existe — evento duplicado, ignorando`)
    return
  }

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")
  const panelUrl = `https://${subdomain}.${appDomain}/painel`

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: { name },
      redirectTo: panelUrl,
    }
  )

  if (inviteError) {
    console.error("[stripe/webhook] Erro ao criar usuário:", inviteError.message)
    throw inviteError
  }

  const userId = inviteData.user.id

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
    console.error("[stripe/webhook] Erro ao inserir expert:", insertError.message)
    throw insertError
  }

  console.log(`[stripe/webhook] Expert criado: ${subdomain} (${email})`)

  // Referral attribution
  const { data: newExpert } = await adminClient
    .from("experts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  if (newExpert) {
    try {
      await createReferralRecords(session, newExpert.id)
    } catch (err) {
      console.error("[stripe/webhook] Falha ao criar referral records:", err)
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
        .eq("user_id", userId)
    } catch (err) {
      console.error("[stripe/webhook] Falha ao enviar email de boas-vindas:", err)
    }
  }
}

// ─── handleSubscriptionDeleted ────────────────────────────────────────────────

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { error } = await adminClient
    .from("experts")
    .update({ active: false })
    .eq("stripe_subscription_id", subscription.id)

  if (error) {
    console.error("[stripe/webhook] Erro ao desativar expert:", error.message)
    throw error
  }

  console.log(`[stripe/webhook] Assinatura cancelada: ${subscription.id}`)
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
