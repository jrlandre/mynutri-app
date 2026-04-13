import type { Metadata } from 'next'
import Script from 'next/script'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { DescubraClient } from './DescubraClient'
import { GTMScript } from '@/components/GTMScript'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Descubra' })
  return {
    title: t('meta_title'),
    description: t('meta_desc'),
    alternates: { canonical: 'https://mynutri.pro/descubra' },
    openGraph: {
      title: t('meta_title'),
      description: t('meta_desc'),
      url: 'https://mynutri.pro/descubra',
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

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MyNutri',
  url: 'https://mynutri.pro',
  description: 'Plataforma de orientação nutricional com IA personalizada por experts.',
}

export default async function DescubraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  return (
    <>
      <GTMScript />
      <Script id="clarity" strategy="afterInteractive">{`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "w2y8n4hh47");
      `}</Script>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      {pixelId && (
        <>
          <Script id="meta-pixel-descubra" strategy="afterInteractive">{`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','${pixelId}');
            fbq('track','PageView');
            fbq('track','ViewContent',{content_name:'Landing Descubra'});
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
      <DescubraClient isLoggedIn={isLoggedIn} />
    </>
  )
}
