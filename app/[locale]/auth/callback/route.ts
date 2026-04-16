import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const origin = host ? `${protocol}://${host}` : new URL(request.url).origin

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const { locale } = await params

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    if (type === 'recovery') {
      return NextResponse.redirect(new URL(`/${locale}/auth/reset-password`, origin))
    }
  }

  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  // If next is bare '/', redirect to the locale-prefixed homepage to preserve locale context.
  // Otherwise next is already locale-prefixed (e.g. /en/painel) — use as-is.
  const destination = safeNext === '/' ? `/${locale}` : safeNext
  return NextResponse.redirect(new URL(destination, origin))
}
