'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function ResetPasswordPage() {
  const t = useTranslations('ResetPassword')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionOk, setSessionOk] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionOk(!!user)
    })
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('mismatch'))
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(t('error'))
      setLoading(false)
      return
    }

    setTimeout(() => router.push('/'), 1500)
  }

  if (sessionOk === null) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    )
  }

  if (!sessionOk) {
    return (
      <main className="min-h-dvh max-w-sm mx-auto flex flex-col px-6 py-10">
        <div className="my-auto flex flex-col items-center gap-4 text-center">
          <span className="text-4xl">🔗</span>
          <h1 className="text-xl font-extrabold tracking-tight">{t('expired_title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('expired_desc')}
          </p>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-primary underline underline-offset-4"
          >
            {t('request_link')}
          </Link>
        </div>
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
            type="password"
            placeholder={t('new_placeholder')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
          <input
            type="password"
            placeholder={t('confirm_placeholder')}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {loading && !error && (
            <p className="text-sm text-muted-foreground text-center">{t('success')}</p>
          )}

          <button
            type="submit"
            disabled={loading || password.length < 6 || confirm.length < 6}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? t('saving') : t('save')}
          </button>
        </motion.form>
      </div>
    </main>
  )
}
