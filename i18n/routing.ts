import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pt', 'en'],
  defaultLocale: 'pt',
  localePrefix: 'as-needed',
  pathnames: {
    '/': '/',
    '/assinar': { pt: '/assinar', en: '/sign-up' },
    '/obrigado': { pt: '/obrigado', en: '/thank-you' },
    '/descubra': { pt: '/descubra', en: '/discover' },
    '/para-experts': { pt: '/para-experts', en: '/for-experts' },
    '/experts': '/experts',
    '/termos': { pt: '/termos', en: '/terms' },
    '/privacidade': { pt: '/privacidade', en: '/privacy' },
    '/convite/[token]': '/convite/[token]',
    '/auth': '/auth',
  },
})
