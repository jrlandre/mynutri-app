import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Recuperação de senha: redirecionar para a tela de reset
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/auth/reset-password', origin))
    }
  }

  // Validar redirect para prevenir open redirect
  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  return NextResponse.redirect(new URL(safeNext, origin))
}
