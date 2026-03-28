import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { captureServerEvent } from '@/lib/posthog'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const origin = host ? `${protocol}://${host}` : request.nextUrl.origin

  const { searchParams } = request.nextUrl
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

    // Buscar client pelo token
    const { data: client, error } = await adminClient
      .from('clients')
      .select('id, expert_id, activated_at, email, token_expires_at')
      .eq('magic_link_token', token)
      .maybeSingle()

    if (error || !client) {
      return NextResponse.redirect(`${origin}/?invite_error=token_invalid`)
    }

    if (client.token_expires_at && new Date(client.token_expires_at as string) < new Date()) {
      return NextResponse.redirect(`${origin}/?invite_error=token_expired`)
    }

    // Validar que o email do convite pertence ao usuário autenticado
    if (client.email && user.email?.toLowerCase() !== client.email.toLowerCase()) {
      return NextResponse.redirect(`${origin}/convite/${token}?error=email_mismatch`)
    }

    if (!client.activated_at) {
      // Ativar cliente
      await adminClient
        .from('clients')
        .update({
          user_id: user.id,
          activated_at: new Date().toISOString(),
          magic_link_token: null,
        })
        .eq('id', client.id)

      await captureServerEvent(user.id, 'client_activated', {
        client_id: client.id,
        expert_id: client.expert_id,
      })
    }

    return NextResponse.redirect(`${origin}/`)
  } catch {
    return NextResponse.redirect(`${origin}/?invite_error=server_error`)
  }
}
