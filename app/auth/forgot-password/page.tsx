'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
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
      setError('Não foi possível enviar o e-mail. Tente novamente.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <main className="h-dvh max-w-sm mx-auto flex flex-col items-center justify-center px-6 gap-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <span className="text-4xl">📩</span>
          <h1 className="text-xl font-extrabold tracking-tight">Verifique seu e-mail</h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de redefinição para <strong className="text-foreground">{email}</strong>.
          </p>
          <Link href="/auth" className="text-sm text-primary underline underline-offset-4">
            Voltar ao login
          </Link>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="h-dvh max-w-sm mx-auto flex flex-col items-center justify-center px-6 gap-8">
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
          Voltar
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight">Esqueceu a senha?</h1>
        <p className="text-sm text-muted-foreground">
          Digite seu e-mail e enviaremos um link para redefinir sua senha.
        </p>
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
          placeholder="seu@email.com"
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
          {loading ? 'Enviando...' : 'Enviar link'}
        </button>
      </motion.form>
    </main>
  )
}
