'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'

interface Props {
  isLoggedIn: boolean
}

export function DescubraClient({ isLoggedIn }: Props) {
  const t = useTranslations('Descubra')

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
          <LocaleSwitcher />
          {isLoggedIn ? (
            <Link
              href="/"
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {t('nav_access')}
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('nav_enter')}
              </Link>
              <Link
                href="/assinar"
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {t('nav_subscribe')}
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
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight whitespace-pre-line">
              {t('hero_title')}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('hero_subtitle')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-center">
            <Link
              href="/"
              className="px-7 py-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all text-center"
            >
              {t('cta_access')}
            </Link>
            <Link
              href="/para-experts"
              className="px-7 py-4 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted active:scale-[0.98] transition-all text-center"
            >
              {t('cta_for_experts')}
            </Link>
          </div>
        </motion.div>
      </main>

      {/* ── Rodapé ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-8 flex flex-wrap gap-x-6 gap-y-2 justify-center">
          <Link href="/experts" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('footer_partners')}
          </Link>
          <Link href="/assinar" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('footer_subscribe')}
          </Link>
          <a href="mailto:suporte@mynutri.pro" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('footer_support')}
          </a>
          <Link href="/termos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('footer_terms')}
          </Link>
          <Link href="/privacidade" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('footer_privacy')}
          </Link>
        </div>
      </footer>
    </div>
  )
}
