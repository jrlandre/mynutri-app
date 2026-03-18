import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireNutritionist, isResponse, PATIENT_LIMIT } from '@/lib/painel/guard'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'
import PatientInviteEmail from '@/emails/PatientInviteEmail'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const guard = await requireNutritionist()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { nutritionist } = guard
    const { email } = await request.json() as { email?: string }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
    }

    // Verificar limite de pacientes ativos
    const limit = PATIENT_LIMIT[nutritionist.plan] ?? 50
    if (isFinite(limit)) {
      const { count, error: countError } = await adminClient
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('nutritionist_id', nutritionist.id)
        .eq('active', true)

      if (countError) throw new Error(countError.message)
      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          { error: `Limite de ${limit} pacientes atingido no plano Standard.` },
          { status: 403 }
        )
      }
    }

    const token = randomUUID()
    const invited_at = new Date().toISOString()

    // Upsert: se já existe convite para esse email nessa nutricionista, renova o token
    const { error: upsertError } = await adminClient
      .from('patients')
      .upsert(
        { nutritionist_id: nutritionist.id, email, magic_link_token: token, invited_at, active: true },
        { onConflict: 'nutritionist_id,email' }
      )

    if (upsertError) throw new Error(upsertError.message)

    const host = request.headers.get('host') ?? 'relapro.app'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const invite_url = `${protocol}://${host}/convite/${token}`

    // Enviar email ao paciente (best-effort — não bloqueia se falhar)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'MyNutri <noreply@relapro.app>',
          to: email,
          subject: `${nutritionist.name} te convidou para o MyNutri`,
          react: PatientInviteEmail({ nutritionistName: nutritionist.name, inviteUrl: invite_url }),
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
