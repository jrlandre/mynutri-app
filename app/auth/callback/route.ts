import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const origin = host ? `${protocol}://${host}` : new URL(request.url).origin
  
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const locale = searchParams.get('locale') === 'en' ? 'en' : null

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Recuperação de senha: redirecionar para a tela de reset preservando locale
    if (type === 'recovery') {
      const resetPath = locale ? `/en/auth/reset-password` : '/auth/reset-password'
      return NextResponse.redirect(new URL(resetPath, origin))
    }
  }

  // Validar redirect para prevenir open redirect
  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  return NextResponse.redirect(new URL(safeNext, origin))
}
