import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import TrialEndingEmail from '@/emails/TrialEndingEmail'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  // Find experts with trial ending in 6–8 days (T-7 ± 1 day window)
  const now = new Date()
  const windowStart = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString()
  const windowEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString()

  const { data: experts, error } = await adminClient
    .from('experts')
    .select('id, name, user_id, subdomain, locale, trial_end')
    .eq('active', true)
    .eq('lifetime', false)
    .gte('trial_end', windowStart)
    .lte('trial_end', windowEnd)

  if (error) {
    logger.error('cron/trial-reminder', 'Erro ao buscar experts com trial expirando', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!experts?.length) {
    return NextResponse.json({ sent: 0 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mynutri.pro'

  let sent = 0
  let failed = 0

  for (const expert of experts) {
    if (!expert.user_id) continue
    try {
      const { data: userData } = await adminClient.auth.admin.getUserById(expert.user_id)
      const email = userData.user?.email
      if (!email) continue

      const expertLocale: 'pt' | 'en' = (expert.locale as string) === 'en' ? 'en' : 'pt'
      const panelUrl = `https://${expert.subdomain}.${appDomain}/painel`
      const subscribeUrl = `${appUrl}/assinar`

      const msLeft = new Date(expert.trial_end as string).getTime() - now.getTime()
      const daysRemaining = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
      const subject = expertLocale === 'en'
        ? `Your MyNutri trial ends in ${daysRemaining} days`
        : `Seu trial do MyNutri expira em ${daysRemaining} dias`

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'MyNutri <noreply@mynutri.pro>',
        to: email,
        subject,
        react: TrialEndingEmail({ name: expert.name, daysRemaining, panelUrl, subscribeUrl, locale: expertLocale }),
      })

      sent++
      logger.info('cron/trial-reminder', 'Email T-7 enviado', { email, expertId: expert.id, daysRemaining })
    } catch (err) {
      failed++
      logger.error('cron/trial-reminder', 'Falha ao enviar email T-7', { error: err, expertId: expert.id })
    }
  }

  return NextResponse.json({ sent, failed })
}
