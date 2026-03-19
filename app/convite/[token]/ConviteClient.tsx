"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface Props {
  token: string
  email: string
  expertName: string
}

export default function ConviteClient({ token, email: initialEmail, expertName }: Props) {
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/api/convite/activate?token=${token}`

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    })

    if (otpError) {
      setError('Não foi possível enviar o e-mail. Tente novamente.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-dvh max-w-sm mx-auto flex flex-col items-center px-6 py-10">
      <div className="my-auto flex flex-col items-center gap-6 text-center w-full">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Convite</p>
        <h1 className="text-xl font-extrabold tracking-tight">
          {expertName} te convidou para o MyNutri
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed text-balance">
          Clientes de Experts parceiros têm acesso ilimitado ao assistente de análise de saúde e performance.
        </p>
      </div>

      {sent ? (
        <div className="flex flex-col gap-2 w-full">
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <p className="text-sm font-medium">Verifique seu e-mail</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enviamos um link de acesso para <span className="font-medium text-foreground">{email}</span>.
            </p>
          </div>
          <button
            onClick={() => setSent(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Usar outro e-mail
          </button>
        </div>
      ) : (
        <form onSubmit={handleAccept} className="flex flex-col gap-3 w-full">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs text-muted-foreground text-left">
              Seu e-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Aceitar convite'}
          </button>
        </form>
      )}
      </div>
    </main>
  )
}
