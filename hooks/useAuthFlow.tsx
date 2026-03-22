'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function getNextUrl(): string {
  if (typeof window === 'undefined') return '/'
  const raw = new URLSearchParams(window.location.search).get('next') ?? '/'
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

export type AuthStep = 'email' | 'login' | 'magic' | 'signup' | 'verify' | 'google'
export type OAuthProvider = 'google'

interface State {
  step: AuthStep
  email: string
  loading: boolean
  error: string | null
  flowId: string | null
  isNewUser: boolean
}

export function useAuthFlow() {
  const [state, setState] = useState<State>({
    step: 'email',
    email: '',
    loading: false,
    error: null,
    flowId: null,
    isNewUser: false,
  })
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const set = (patch: Partial<State>) => setState(s => ({ ...s, ...patch }))

  // Cross-tab sync: quando o usuário confirma o e-mail em outra aba
  useEffect(() => {
    if (state.step !== 'verify') return

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        router.push(getNextUrl())
      }
    })

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) router.push(getNextUrl())
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [state.step, router, supabase])

  const handleEmailSubmit = useCallback(async (email: string) => {
    set({ loading: true, error: null })
    try {
      const flowRes = await fetch('/api/auth/flow', { method: 'POST' })
      if (flowRes.status === 429) {
        set({ loading: false, error: 'Muitas tentativas. Tente novamente mais tarde.' })
        return
      }
      const flowData = await flowRes.json()
      const flowId: string | null = flowData.flowId ?? null

      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.status === 429) {
        set({ loading: false, error: 'Muitas tentativas. Tente novamente mais tarde.' })
        return
      }

      const data = await res.json()

      let step: AuthStep
      if (!data.exists) {
        step = 'signup'
      } else if (!data.confirmed) {
        step = 'verify'
      } else if (data.provider === 'google') {
        step = 'google'
      } else if (data.provider === 'email' && data.hasPassword === false) {
        step = 'magic'
      } else {
        step = 'login'
      }

      setState(s => ({ ...s, step, email, flowId, loading: false }))
    } catch {
      set({ loading: false, error: 'Erro ao verificar e-mail. Tente novamente.' })
    }
  }, [])

  const handleLogin = useCallback(async (password: string) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: state.email, password })
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          set({ loading: false, step: 'verify' })
          return
        }
        throw error
      }
      router.push(getNextUrl())
    } catch (err: unknown) {
      set({ loading: false, error: translateError(err) })
    }
  }, [state.email, router, supabase])

  const handleSignup = useCallback(async (password: string) => {
    set({ loading: true, error: null })
    try {
      const next = getNextUrl()
      const { data, error } = await supabase.auth.signUp({
        email: state.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?source=signup&next=${encodeURIComponent(next)}`,
        },
      })
      if (error) throw error
      if (data.session) {
        router.push(getNextUrl())
      } else {
        set({ loading: false, step: 'verify', isNewUser: true })
      }
    } catch (err: unknown) {
      set({ loading: false, error: translateError(err) })
    }
  }, [state.email, router, supabase])

  const handleResend = useCallback(async () => {
    set({ loading: true, error: null })
    try {
      const next = getNextUrl()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: state.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?source=signup&next=${encodeURIComponent(next)}`,
        },
      })
      if (error) throw error
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: translateError(err) })
    }
  }, [state.email, supabase])

  const handleBack = useCallback(() => {
    set({ step: 'email', error: null })
  }, [])

  const handleMagicLogin = useCallback(async () => {
    set({ loading: true, error: null })
    try {
      const next = getNextUrl()
      const { error } = await supabase.auth.signInWithOtp({
        email: state.email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
      if (error) throw error
      set({ loading: false, step: 'verify', isNewUser: false })
    } catch (err: unknown) {
      set({ loading: false, error: translateError(err) })
    }
  }, [state.email, supabase])

  const handleOAuth = useCallback(async (provider: OAuthProvider) => {
    const next = getNextUrl()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }, [supabase])

  return {
    ...state,
    handleEmailSubmit,
    handleLogin,
    handleMagicLogin,
    handleSignup,
    handleResend,
    handleBack,
    handleOAuth,
    isNewUser: state.isNewUser,
  }
}

function translateError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado.'
  if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.'
  if (msg.includes('rate limit') || msg.includes('Rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.'
  return msg
}
