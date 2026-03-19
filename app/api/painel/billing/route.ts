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

  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '')
    .replace(/^0\.0\.0\.0/, 'localhost')
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const origin = host ? `${protocol}://${host}` : new URL(request.url).origin

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const session = await stripe.billingPortal.sessions.create({
    customer: nutritionist.stripe_customer_id,
    return_url: `${origin}/painel`,
  })

  return NextResponse.json({ url: session.url })
}
