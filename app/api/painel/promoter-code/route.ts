import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { adminClient } from "@/lib/supabase/admin"

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { data: expert } = await adminClient
    .from("experts")
    .select("is_promoter, stripe_coupon_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle()

  if (!expert?.is_promoter || !expert.stripe_coupon_id) {
    return NextResponse.json({ code: null })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 500 })
  }

  try {
    const stripe = new Stripe(stripeKey)
    const promoCodes = await stripe.promotionCodes.list({
      coupon: expert.stripe_coupon_id,
      active: true,
      limit: 1,
    })
    const code = promoCodes.data[0]?.code ?? null
    return NextResponse.json({ code })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar código"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
