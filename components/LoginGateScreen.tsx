"use client"

import { motion } from "framer-motion"
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'

export default function LoginGateScreen({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('LoginGate')
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center px-8 py-12 gap-6 text-center flex-1"
    >
      <div className="flex flex-col gap-2">
        <p className="text-lg font-semibold tracking-tight">
          {t('title')}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed text-balance">
          {t('desc')}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        <button
          onClick={() => { onNavigate?.(); router.push('/auth?next=/' as '/auth') }}
          className="w-full flex flex-col items-center justify-center px-5 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <span className="text-sm font-medium">{t('create')}</span>
          <span className="text-xs opacity-75">{t('create_sub')}</span>
        </button>
        <button
          onClick={() => { onNavigate?.(); router.push('/auth?next=/' as '/auth') }}
          className="w-full flex flex-col items-center justify-center px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.97] transition-all"
        >
          <span className="text-sm font-medium">{t('login')}</span>
          <span className="text-xs text-muted-foreground">{t('login_sub')}</span>
        </button>
      </div>
    </motion.div>
  )
}
