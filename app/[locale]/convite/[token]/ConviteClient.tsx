"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useTranslations, useLocale } from 'next-intl'

interface Props {
  token: string
  email: string
  expertName: string
  currentEmail: string | null
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function ConviteClient({ token, email: initialEmail, expertName, currentEmail }: Props) {
  const t = useTranslations('Convite')
  const locale = useLocale()
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Se o email já tem senha, redireciona para o fluxo de auth normal
    // (lá o usuário pode entrar com senha ou pedir um link por email)
    const checkRes = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const checkData = await checkRes.json() as { hasPassword?: boolean; provider?: string; exists?: boolean }

    if (checkData.hasPassword || (checkData.exists && checkData.provider !== 'email')) {
      const activateUrl = `/api/convite/activate?token=${token}`
      window.location.href = `/${locale}/auth?next=${encodeURIComponent(activateUrl)}&email=${encodeURIComponent(email)}`
      return
    }

    // Sem senha → fluxo OTP
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/api/convite/activate?token=${token}&locale=${locale}`
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    })

    if (otpError) {
      setError(t('error_send'))
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setOauthLoading(true)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/api/convite/activate?token=${token}&locale=${locale}`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  return (
    <main className="min-h-dvh max-w-sm mx-auto flex flex-col items-center px-6 py-10">
      <div className="my-auto flex flex-col items-center gap-6 text-center w-full">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('badge')}</p>
          <h1 className="text-xl font-extrabold tracking-tight">
            {t('invited_by', { expertName })}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed text-balance">
            {t('access_desc')}
          </p>
        </div>

        {currentEmail && currentEmail.toLowerCase() !== initialEmail.toLowerCase() && (
          <div className="w-full rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 text-left leading-relaxed">
            {t.rich('wrong_account', {
              inviteEmail: initialEmail,
              currentEmail,
              bold: (chunks) => <span className="font-semibold">{chunks}</span>,
            })}
          </div>
        )}

        {sent ? (
          <div className="flex flex-col gap-2 w-full">
            <div className="rounded-xl border border-border bg-card px-5 py-4">
              <p className="text-sm font-medium">{t('check_email_title')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t.rich('check_email_desc', {
                  email,
                  bold: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
                })}
              </p>
            </div>
            <button
              onClick={() => setSent(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('use_other_email')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleGoogle}
              disabled={oauthLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
            >
              <GoogleIcon />
              {t('google_continue')}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{t('or')}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleAccept} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs text-muted-foreground text-left">
                  {t('email_label')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={initialEmail ? undefined : e => setEmail(e.target.value)}
                  readOnly={!!initialEmail}
                  placeholder={t('email_placeholder')}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 read-only:bg-muted read-only:text-muted-foreground read-only:cursor-default"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || oauthLoading || !email}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50"
              >
                {loading ? t('sending') : t('accept')}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
