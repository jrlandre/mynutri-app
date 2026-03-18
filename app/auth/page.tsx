'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthFlow } from '@/hooks/useAuthFlow'
import type { OAuthProvider } from '@/hooks/useAuthFlow'
import Link from 'next/link'

const variants = {
  enter: { opacity: 0, y: 10 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export default function AuthPage() {
  const flow = useAuthFlow()

  return (
    <main className="min-h-dvh max-w-sm mx-auto flex flex-col px-6 py-10">
      <div className="my-auto w-full">
      <AnimatePresence mode="wait">
        {flow.step === 'email' && (
          <EmailStep key="email" flow={flow} />
        )}
        {flow.step === 'login' && (
          <LoginStep key="login" flow={flow} />
        )}
        {flow.step === 'signup' && (
          <SignupStep key="signup" flow={flow} />
        )}
        {flow.step === 'verify' && (
          <VerifyStep key="verify" flow={flow} />
        )}
      </AnimatePresence>
      </div>
    </main>
  )
}

// ── Email step ────────────────────────────────────────────────────────────────

function EmailStep({ flow }: { flow: ReturnType<typeof useAuthFlow> }) {
  const [email, setEmail] = useState('')
  const router = useRouter()

  function handleBack() {
    if (window.history.length > 1 && document.referrer.includes(window.location.host)) {
      router.back()
    } else {
      router.push('/')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim()) flow.handleEmailSubmit(email.trim())
  }

  return (
    <motion.div
      variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-6 w-full"
    >
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition w-fit"
      >
        <ChevronLeft />
        Voltar
      </button>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">MyNutri</h1>
        <p className="text-sm text-muted-foreground">Entre para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
        <input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoFocus
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
        />

        {flow.error && (
          <p className="text-sm text-destructive text-center">{flow.error}</p>
        )}

        <button
          type="submit"
          disabled={flow.loading || !email.trim()}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {flow.loading ? 'Verificando...' : 'Continuar'}
        </button>
      </form>

      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <OAuthRow onSelect={flow.handleOAuth} />
    </motion.div>
  )
}

// ── Login step ────────────────────────────────────────────────────────────────

function LoginStep({ flow }: { flow: ReturnType<typeof useAuthFlow> }) {
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    flow.handleLogin(password)
  }

  return (
    <motion.div
      variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-6 w-full"
    >
      <div className="flex flex-col gap-1">
        <button
          onClick={flow.handleBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition w-fit"
        >
          <ChevronLeft />
          Voltar
        </button>
        <h2 className="text-xl font-extrabold tracking-tight mt-2">Bem-vindo de volta</h2>
        <p className="text-sm text-muted-foreground truncate">{flow.email}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoFocus
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
        />

        {flow.error && (
          <p className="text-sm text-destructive text-center">{flow.error}</p>
        )}

        <button
          type="submit"
          disabled={flow.loading || !password}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {flow.loading ? 'Entrando...' : 'Entrar'}
        </button>

        <Link
          href="/auth/forgot-password"
          className="text-sm text-muted-foreground hover:text-foreground transition text-center"
        >
          Esqueceu a senha?
        </Link>
      </form>
    </motion.div>
  )
}

// ── Signup step ───────────────────────────────────────────────────────────────

function SignupStep({ flow }: { flow: ReturnType<typeof useAuthFlow> }) {
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    flow.handleSignup(password)
  }

  return (
    <motion.div
      variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-6 w-full"
    >
      <div className="flex flex-col gap-1">
        <button
          onClick={flow.handleBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition w-fit"
        >
          <ChevronLeft />
          Voltar
        </button>
        <h2 className="text-xl font-extrabold tracking-tight mt-2">Criar conta</h2>
        <p className="text-sm text-muted-foreground truncate">{flow.email}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          placeholder="Crie uma senha (mín. 6 caracteres)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          autoFocus
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
        />

        {flow.error && (
          <p className="text-sm text-destructive text-center">{flow.error}</p>
        )}

        <button
          type="submit"
          disabled={flow.loading || password.length < 6}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {flow.loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
    </motion.div>
  )
}

// ── Verify step ───────────────────────────────────────────────────────────────

function VerifyStep({ flow }: { flow: ReturnType<typeof useAuthFlow> }) {
  const [resent, setResent] = useState(false)

  async function handleResend() {
    await flow.handleResend()
    if (!flow.error) setResent(true)
  }

  return (
    <motion.div
      variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-6 w-full text-center"
    >
      <span className="text-4xl">📬</span>

      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-extrabold tracking-tight">Confirme seu e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Enviamos um link para <strong className="text-foreground">{flow.email}</strong>.
          <br />
          Clique nele para ativar sua conta.
        </p>
      </div>

      {flow.error && (
        <p className="text-sm text-destructive">{flow.error}</p>
      )}

      <button
        onClick={handleResend}
        disabled={flow.loading || resent}
        className="text-sm text-primary underline underline-offset-4 disabled:opacity-50 disabled:no-underline"
      >
        {resent ? 'E-mail reenviado ✓' : flow.loading ? 'Reenviando...' : 'Reenviar e-mail'}
      </button>

      <button
        onClick={flow.handleBack}
        className="text-sm text-muted-foreground hover:text-foreground transition"
      >
        Usar outro e-mail
      </button>
    </motion.div>
  )
}

// ── OAuth row ────────────────────────────────────────────────────────────────

function OAuthRow({ onSelect }: { onSelect: (p: OAuthProvider) => void }) {
  return (
    <button
      onClick={() => onSelect('google')}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-medium"
    >
      <GoogleIcon />
      Continuar com Google
    </button>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
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
