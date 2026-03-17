import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminClient } from "@/lib/supabase/admin"

const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada")
  return new Stripe(key)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      subdomain?: string
      name?: string
      email?: string
      plan?: string
    }

    const { subdomain, name, email, plan } = body

    if (!subdomain || !name || !email || !plan) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 })
    }

    if (!SUBDOMAIN_REGEX.test(subdomain)) {
      return NextResponse.json({ error: "Subdomínio inválido." }, { status: 400 })
    }

    if (!["monthly", "yearly"].includes(plan)) {
      return NextResponse.json({ error: "Plano inválido." }, { status: 400 })
    }

    // Verificar disponibilidade do subdomínio
    const { data: existing } = await adminClient
      .from("nutritionists")
      .select("id")
      .eq("subdomain", subdomain)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "Este subdomínio já está em uso." }, { status: 409 })
    }

    const priceId = plan === "monthly"
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_YEARLY

    if (!priceId) {
      return NextResponse.json({ error: "Configuração de preço ausente." }, { status: 500 })
    }

    const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")
    if (!appDomain) {
      return NextResponse.json({ error: "Configuração de domínio ausente." }, { status: 500 })
    }

    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { subdomain, name, email },
      success_url: `https://${appDomain}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://${appDomain}/assinar`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
