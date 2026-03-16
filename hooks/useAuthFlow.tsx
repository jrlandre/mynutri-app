'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type AuthStep = 'email' | 'login' | 'signup' | 'verify'
export type OAuthProvider = 'google'

interface State {
  step: AuthStep
  email: string
  loading: boolean
  error: string | null
  flowId: string | null
}

export function useAuthFlow() {
  const [state, setState] = useState<State>({
    step: 'email',
    email: '',
    loading: false,
    error: null,
    flowId: null,
  })
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const set = (patch: Partial<State>) => setState(s => ({ ...s, ...patch }))

  // Cross-tab sync: quando o usuário confirma o e-mail em outra aba
  useEffect(() => {
    if (state.step !== 'verify') return

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        router.push('/')
      }
    })

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) router.push('/')
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
      const flowData = await flowRes.json()
      const flowId: string | null = flowData.flowId ?? null

      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, flowId }),
      })
      const data = await res.json()

      if (res.status === 429) {
        set({ loading: false, error: 'Muitas tentativas. Tente novamente mais tarde.' })
        return
      }

      let step: AuthStep
      if (!data.exists) {
        step = 'signup'
      } else if (!data.confirmed) {
        step = 'verify'
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
      router.push('/')
    } catch (err: unknown) {
      set({ loading: false, error: translateError(err) })
    }
  }, [state.email, router, supabase])

  const handleSignup = useCallback(async (password: string) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signUp({
        email: state.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?source=signup`,
        },
      })
      if (error) throw error
      if (data.session) {
        router.push('/')
      } else {
        set({ loading: false, step: 'verify' })
      }
    } catch (err: unknown) {
      set({ loading: false, error: translateError(err) })
    }
  }, [state.email, router, supabase])

  const handleResend = useCallback(async () => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: state.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?source=signup`,
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

  const handleOAuth = useCallback(async (provider: OAuthProvider) => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }, [supabase])

  return {
    ...state,
    handleEmailSubmit,
    handleLogin,
    handleSignup,
    handleResend,
    handleBack,
    handleOAuth,
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
