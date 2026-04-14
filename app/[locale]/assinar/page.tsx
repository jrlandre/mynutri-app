import Script from 'next/script'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { createClient } from "@/lib/supabase/server"
import AssinarClient from "./AssinarClient"
import { PRICING } from '@/lib/config/pricing'
import { GTMScript } from '@/components/GTMScript'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Assinar' })
  const monthly = await getTranslations({ locale, namespace: 'Assinar' })
  return {
    title: t('meta_title'),
    description: t('meta_desc'),
    alternates: { canonical: 'https://mynutri.pro/assinar' },
    openGraph: {
      title: t('meta_title'),
      url: 'https://mynutri.pro/assinar',
      type: 'website',
      images: [{ url: '/og-default.png', width: 1200, height: 630 }],
    },
  }
}

async function getProductJsonLd(locale: string) {
  const t = await getTranslations({ locale, namespace: 'Assinar' })
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'MyNutri Expert Plan',
    description: 'Espaço personalizado com IA para experts atenderem seus clientes.',
    offers: [
      {
        '@type': 'Offer',
        name: t('jsonld_monthly_name'),
        price: PRICING.monthly.amount.toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: t('jsonld_annual_name'),
        price: PRICING.yearly.amount.toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    ],
  }
}

export default async function AssinarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ ref?: string }>
}) {
  const { locale } = await params
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { ref } = await searchParams
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const productJsonLd = await getProductJsonLd(locale)

  return (
    <>
      <GTMScript />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {pixelId && (
        <>
          <Script id="meta-pixel-assinar" strategy="afterInteractive">{`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','${pixelId}');
            fbq('track','PageView');
          `}</Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}
      <AssinarClient
        appDomain={appDomain}
        locale={locale}
        defaultEmail={user?.email ?? ""}
        defaultRef={ref ?? ""}
      />
    </>
  )
}
