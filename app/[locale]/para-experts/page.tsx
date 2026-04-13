import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ParaExpertsClient } from './ParaExpertsClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ParaExperts' })
  return {
    title: t('meta_title'),
    description: t('meta_desc'),
    alternates: { canonical: 'https://mynutri.pro/para-experts' },
    openGraph: {
      title: t('meta_title'),
      description: t('meta_desc'),
      url: 'https://mynutri.pro/para-experts',
      type: 'website',
      images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MyNutri' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('meta_title'),
      description: t('meta_desc'),
      images: ['/og-default.png'],
    },
  }
}

export default function ParaExpertsPage() {
  return <ParaExpertsClient />
}
