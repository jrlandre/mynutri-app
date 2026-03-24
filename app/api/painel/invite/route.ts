import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireExpert, isResponse, CLIENT_LIMIT } from '@/lib/painel/guard'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'
import ClientInviteEmail from '@/emails/ClientInviteEmail'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const guard = await requireExpert()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { expert } = guard
    const { email } = await request.json() as { email?: string }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]{2,}\.[^\s@]{2,}$/.test(email.trim())) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
    }

    // Verificar limite de clientes ativos (Modo Padrinho: bypass se for admin)
    const limit = CLIENT_LIMIT[expert.plan] ?? 50
    if (isFinite(limit) && !expert.is_admin) {
      const { count, error: countError } = await adminClient
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('expert_id', expert.id)
        .eq('active', true)

      if (countError) throw new Error(countError.message)
      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          { error: `Limite de ${limit} clientes atingido no plano Standard.` },
          { status: 403 }
        )
      }
    }

    const token = randomUUID()
    const invited_at = new Date().toISOString()
    const token_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Upsert: se já existe convite para esse email nesse expert, renova o token
    const { error: upsertError } = await adminClient
      .from('clients')
      .upsert(
        { expert_id: expert.id, email, magic_link_token: token, token_expires_at, invited_at, active: true },
        { onConflict: 'expert_id,email' }
      )

    if (upsertError) throw new Error(upsertError.message)

    const host = request.headers.get('host') ?? 'mynutri.pro'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const invite_url = `${protocol}://${host}/convite/${token}`

    // Enviar email ao cliente (best-effort — não bloqueia se falhar)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'MyNutri <noreply@mynutri.pro>',
          to: email,
          subject: `${expert.name} te convidou para o MyNutri`,
          react: ClientInviteEmail({ expertName: expert.name, inviteUrl: invite_url }),
        })
      } catch (err) {
        console.error('[invite] Falha ao enviar email:', err)
      }
    }

    return NextResponse.json({ invite_url })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}
