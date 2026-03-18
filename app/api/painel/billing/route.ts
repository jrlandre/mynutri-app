import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: nutritionist } = await adminClient
    .from('nutritionists')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (!nutritionist?.stripe_customer_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const { origin } = new URL(request.url)

  const session = await stripe.billingPortal.sessions.create({
    customer: nutritionist.stripe_customer_id,
    return_url: `${origin}/painel`,
  })

  return NextResponse.json({ url: session.url })
}
