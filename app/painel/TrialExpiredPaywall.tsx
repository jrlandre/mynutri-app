'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/navigation'

export default function TrialExpiredPaywall() {
  const t = useTranslations('Painel')
  const router = useRouter()

  return (
    <main className="min-h-dvh max-w-sm mx-auto px-6 flex flex-col items-center justify-center gap-8 text-center">
      <span className="text-5xl">⏰</span>
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{t('trial_expired_title')}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t('trial_expired_desc')}</p>
      </div>
      <div className="flex flex-col gap-3 w-full">
        <Link
          href="/assinar"
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all text-center"
        >
          {t('trial_expired_cta')}
        </Link>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('back')}
        </button>
      </div>
    </main>
  )
}
