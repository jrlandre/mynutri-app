'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useTransition } from 'react'

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const nextLocale = locale === 'pt' ? 'en' : 'pt'
    startTransition(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace(pathname as any, { locale: nextLocale })
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted disabled:opacity-50"
      aria-label={locale === 'pt' ? 'Switch to English' : 'Mudar para Português'}
    >
      {locale === 'pt' ? 'EN' : 'PT'}
    </button>
  )
}
