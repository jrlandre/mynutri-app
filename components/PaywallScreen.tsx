"use client"

import { motion } from "framer-motion"
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'

interface Props {
  tenantSubdomain?: string
}

export default function PaywallScreen({ tenantSubdomain }: Props) {
  const t = useTranslations('Paywall')
  const router = useRouter()

  function handleShare() {
    const text = t('share_text')
    const url = "https://mynutri.pro"

    if (navigator.share) {
      navigator.share({ text, url }).catch(() => {})
    } else {
      const whatsapp = `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`
      window.open(whatsapp, "_blank")
    }
  }

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
        <p className="text-lg font-semibold tracking-tight mt-1">
          {t('question')}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        <button
          onClick={handleShare}
          className="w-full flex flex-col items-center justify-center px-5 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <span className="text-sm font-medium">{t('yes')}</span>
          <span className="text-xs opacity-75">{t('yes_sub')}</span>
        </button>
        <button
          onClick={() => {
            if (tenantSubdomain) {
              const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mynutri.pro'
              window.location.href = `${base}/experts/${tenantSubdomain}`
            } else {
              router.push('/experts')
            }
          }}
          className="w-full flex flex-col items-center justify-center px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.97] transition-all"
        >
          <span className="text-sm font-medium">{t('no')}</span>
          <span className="text-xs text-muted-foreground">{t('no_sub')}</span>
        </button>
      </div>

      <button
        onClick={() => router.push('/auth')}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {t('other_account')}
      </button>

      <button
        onClick={() => router.push('/para-nutricionistas')}
        className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="font-medium">{t('expert_cta')}</span>
        <span>{t('expert_sub')}</span>
      </button>
    </motion.div>
  )
}
