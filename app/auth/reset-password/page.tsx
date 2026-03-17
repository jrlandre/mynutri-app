'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionOk, setSessionOk] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionOk(!!session)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Não foi possível redefinir a senha. Tente novamente.')
      setLoading(false)
      return
    }

    // Aguarda brevemente para o toast visual e redireciona
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
          <h1 className="text-xl font-extrabold tracking-tight">Link expirado</h1>
          <p className="text-sm text-muted-foreground">
            Este link de redefinição não é mais válido.<br />
            Solicite um novo abaixo.
          </p>
          <a
            href="/auth/forgot-password"
            className="text-sm text-primary underline underline-offset-4"
          >
            Solicitar novo link
          </a>
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
        <h1 className="text-xl font-extrabold tracking-tight">Nova senha</h1>
        <p className="text-sm text-muted-foreground">Escolha uma senha com pelo menos 6 caracteres.</p>
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
          placeholder="Nova senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          autoFocus
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
        />
        <input
          type="password"
          placeholder="Confirmar senha"
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
          <p className="text-sm text-muted-foreground text-center">Senha redefinida! Redirecionando...</p>
        )}

        <button
          type="submit"
          disabled={loading || password.length < 6 || confirm.length < 6}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </motion.form>
      </div>
    </main>
  )
}
