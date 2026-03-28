import type { Metadata } from 'next'
import Script from 'next/script'
import { DescubraClient } from './DescubraClient'
import { GTMScript } from '@/components/GTMScript'

export const metadata: Metadata = {
  title: 'MyNutri — IA nutricional personalizada pelo seu expert',
  description:
    'Profissionais de saúde e performance que querem oferecer algo diferente aos clientes. Crie seu espaço com IA personalizada.',
  openGraph: {
    title: 'MyNutri — IA nutricional personalizada pelo seu expert',
    description:
      'Profissionais de saúde e performance que querem oferecer algo diferente aos clientes. Crie seu espaço com IA personalizada.',
    url: 'https://mynutri.pro/descubra',
    type: 'website',
    images: [{ url: '/og-descubra.png', width: 1200, height: 630, alt: 'MyNutri' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyNutri — IA nutricional personalizada pelo seu expert',
    description:
      'Profissionais de saúde e performance que querem oferecer algo diferente aos clientes. Crie seu espaço com IA personalizada.',
    images: ['/og-descubra.png'],
  },
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MyNutri',
  url: 'https://mynutri.pro',
  description:
    'Plataforma de orientação nutricional com IA personalizada por profissionais de saúde e performance.',
}

export default function DescubraPage() {
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
      <DescubraClient />
    </>
  )
}
