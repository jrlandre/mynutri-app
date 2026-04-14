import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pt', 'en'],
  defaultLocale: 'pt',
  localePrefix: 'as-needed',
  pathnames: {
    '/': '/',
    '/assinar': { pt: '/assinar', en: '/subscribe' },
    '/obrigado': { pt: '/obrigado', en: '/thank-you' },
    '/descubra': { pt: '/descubra', en: '/discover' },
    '/para-experts': { pt: '/para-experts', en: '/for-experts' },
    '/experts': { pt: '/nutricionistas', en: '/nutritionists' },
    '/experts/[handle]': { pt: '/nutricionistas/[handle]', en: '/nutritionists/[handle]' },
    '/termos': { pt: '/termos', en: '/terms' },
    '/privacidade': { pt: '/privacidade', en: '/privacy' },
    '/convite/[token]': '/convite/[token]',
    '/auth': '/auth',
    '/auth/forgot-password': '/auth/forgot-password',
    '/auth/reset-password': '/auth/reset-password',
    '/painel': '/painel',
    '/sudo': '/sudo',
  },
})
