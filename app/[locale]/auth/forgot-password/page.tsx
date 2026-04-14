'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function ForgotPasswordPage() {
  const t = useTranslations('ForgotPassword')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (error) {
      setError(t('error'))
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <main className="min-h-dvh max-w-sm mx-auto flex flex-col px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="my-auto flex flex-col items-center gap-4"
        >
          <span className="text-4xl">📩</span>
          <h1 className="text-xl font-extrabold tracking-tight">{t('check_email_title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t.rich('check_email_desc', {
              email,
              bold: (chunks) => <strong className="text-foreground">{chunks}</strong>,
            })}
          </p>
          <Link href="/auth" className="text-sm text-primary underline underline-offset-4">
            {t('back_to_login')}
          </Link>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh max-w-sm mx-auto flex flex-col px-6 py-10">
      <div className="my-auto flex flex-col gap-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2 w-full"
        >
          <Link
            href="/auth"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition w-fit mb-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {t('back')}
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('desc')}</p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col gap-3 w-full"
        >
          <input
            type="email"
            placeholder={t('email_placeholder')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? t('sending') : t('send')}
          </button>
        </motion.form>
      </div>
    </main>
  )
}
