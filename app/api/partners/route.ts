import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')
  const specialty = searchParams.get('specialty')

  let query = supabase
    .from('nutritionists')
    .select('id, subdomain, name, photo_url, specialty, city, contact_links')
    .eq('active', true)
    .eq('listed', true)
    .order('name')

  if (city) query = query.ilike('city', `%${city}%`)
  if (specialty) query = query.ilike('specialty', `%${specialty}%`)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar parceiros' }, { status: 500 })
  }

  return NextResponse.json({ partners: data ?? [] })
}
