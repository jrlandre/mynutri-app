import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl
  const token = searchParams.get('token')
  const code = searchParams.get('code')

  // Trocar código por sessão (Supabase OTP callback)
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  if (!token) {
    return NextResponse.redirect(`${origin}/?invite_error=token_missing`)
  }

  try {
    // Pegar usuário já autenticado
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Ainda não autenticado — redireciona para convite novamente
      return NextResponse.redirect(`${origin}/convite/${token}?error=auth_required`)
    }

    // Buscar patient pelo token
    const { data: patient, error } = await adminClient
      .from('patients')
      .select('id, activated_at')
      .eq('magic_link_token', token)
      .maybeSingle()

    if (error || !patient) {
      return NextResponse.redirect(`${origin}/?invite_error=token_invalid`)
    }

    if (!patient.activated_at) {
      // Ativar paciente
      await adminClient
        .from('patients')
        .update({
          user_id: user.id,
          activated_at: new Date().toISOString(),
          magic_link_token: null,
        })
        .eq('id', patient.id)
    }

    return NextResponse.redirect(`${origin}/`)
  } catch {
    return NextResponse.redirect(`${origin}/?invite_error=server_error`)
  }
}
