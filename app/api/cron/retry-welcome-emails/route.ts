import { NextResponse } from "next/server"
import { adminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import ExpertWelcomeEmail from "@/emails/ExpertWelcomeEmail"
import { logger } from "@/lib/logger"

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization")
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Resend API key missing" }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")

  // Buscar experts criados nos últimos 7 dias que não receberam o email de boas-vindas
  const { data: experts, error } = await adminClient
    .from("experts")
    .select(`
      id,
      user_id,
      subdomain,
      name,
      users:user_id ( email )
    `)
    .eq("welcome_email_sent", false)
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(50)

  if (error) {
    logger.error('cron/retry-welcome-emails', 'Erro ao buscar experts', { error })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!experts || experts.length === 0) {
    return NextResponse.json({ message: "Nenhum email pendente." })
  }

  const results = []

  for (const expert of experts) {
    const user = (expert.users as unknown as { email: string })
    const email = user?.email
    if (!email) continue

    const panelUrl = `https://${expert.subdomain}.${appDomain}/painel?tab=exibicao`

    try {
      // Marcar como enviado ANTES de enviar — previne duplicatas em execuções paralelas.
      // Se o envio falhar, o expert fica marcado como enviado (aceitável vs duplicata).
      const { data: claimed } = await adminClient
        .from("experts")
        .update({ welcome_email_sent: true })
        .eq("id", expert.id)
        .eq("welcome_email_sent", false) // só atualiza se ainda false (lock otimista)
        .select("id")

      if (!claimed || claimed.length === 0) {
        // Outra execução paralela já reivindicou este expert
        results.push({ id: expert.id, status: "skipped" })
        continue
      }

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'MyNutri <noreply@mynutri.pro>',
        to: email,
        subject: `Boas-vindas ao MyNutri, ${expert.name.split(' ')[0]}!`,
        react: ExpertWelcomeEmail({ name: expert.name, panelUrl }),
      })

      results.push({ id: expert.id, status: "success" })
    } catch (err) {
      logger.error('cron/retry-welcome-emails', 'Falha ao reenviar email de boas-vindas', { error: err, expertId: expert.id, email })
      const message = err instanceof Error ? err.message : String(err)
      results.push({ id: expert.id, status: "error", error: message })
    }
  }

  return NextResponse.json({ message: "Processamento concluído", results })
}
