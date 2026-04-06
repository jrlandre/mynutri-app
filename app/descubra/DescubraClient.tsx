'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const FOOTER_LINKS = [
  { label: 'Experts parceiros', href: '/experts' },
  { label: 'Assinar', href: '/assinar' },
  { label: 'Suporte', href: 'mailto:suporte@mynutri.pro' },
  { label: 'Termos de uso', href: '/termos' },
  { label: 'Privacidade', href: '/privacidade' },
]

interface Props {
  isLoggedIn: boolean
}

export function DescubraClient({ isLoggedIn }: Props) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const source = params.get('utm_source')
    if (!source) return
    const utm = {
      utm_source: source,
      utm_medium: params.get('utm_medium') ?? '',
      utm_campaign: params.get('utm_campaign') ?? '',
      utm_content: params.get('utm_content') ?? '',
      utm_term: params.get('utm_term') ?? '',
    }
    const maxAge = 30 * 24 * 60 * 60
    document.cookie = `utm_params=${encodeURIComponent(JSON.stringify(utm))}; max-age=${maxAge}; path=/; samesite=lax`
  }, [])

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="max-w-2xl mx-auto w-full px-4 pt-5 pb-4 flex items-center justify-between">
        <span className="text-xl font-extrabold tracking-tight">MyNutri</span>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link
              href="/"
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Acessar o MyNutri
            </Link>
          ) : (
            <>
              <Link
                href="/auth?next=/descubra"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/assinar"
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Assinar
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col items-center text-center gap-8 w-full max-w-lg"
        >
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              A IA que aplica o método<br />
              do especialista.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              O método certo. A resposta certa. Na hora que precisar.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-center">
            <Link
              href="/"
              className="px-7 py-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all text-center"
            >
              Acessar agora
            </Link>
            <Link
              href="/para-experts"
              className="px-7 py-4 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted active:scale-[0.98] transition-all text-center"
            >
              Para experts
            </Link>
          </div>
        </motion.div>

        {/* TODO: [backlog] adicionar vídeos de exemplo de uso */}
      </main>

      {/* ── Rodapé ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-8 flex flex-wrap gap-x-6 gap-y-2 justify-center">
          {FOOTER_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
