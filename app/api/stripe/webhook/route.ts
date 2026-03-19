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
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
    } else if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
    }
  } catch (err) {
    console.error(`[stripe/webhook] Erro ao processar ${event.type}:`, err)
    // Retornar 200 mesmo em erro para não causar retry desnecessário em alguns casos,
    // mas logamos para investigação
    return NextResponse.json({ error: "Erro interno no processamento." }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { subdomain, name, email } = session.metadata ?? {}
  const stripe_customer_id = typeof session.customer === "string" ? session.customer : null
  const stripe_subscription_id = typeof session.subscription === "string" ? session.subscription : null

  if (!subdomain || !name || !email) {
    console.error("[stripe/webhook] Metadata incompleta:", session.metadata)
    return
  }

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")
  const panelUrl = `https://${subdomain}.${appDomain}/painel`

  // Criar usuário no Supabase Auth via convite (envia email automaticamente)
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

  // Criar registro do expert
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
    })

  if (insertError) {
    console.error("[stripe/webhook] Erro ao inserir expert:", insertError.message)
    throw insertError
  }

  console.log(`[stripe/webhook] Expert criado: ${subdomain} (${email})`)

  // Enviar email de boas-vindas via Resend (best-effort — não bloqueia o webhook)
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'MyNutri <noreply@relapro.app>',
        to: email,
        subject: `Boas-vindas ao MyNutri, ${name.split(' ')[0]}!`,
        react: ExpertWelcomeEmail({ name, panelUrl }),
      })
    } catch (err) {
      console.error('[stripe/webhook] Falha ao enviar email de boas-vindas:', err)
    }
  }
}

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
