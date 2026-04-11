import Script from 'next/script'
import { createClient } from "@/lib/supabase/server"
import AssinarClient from "./AssinarClient"
import { GTMScript } from '@/components/GTMScript'

const productJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'MyNutri Expert Plan',
  description:
    'Espaço personalizado com IA para experts atenderem seus clientes.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Mensal',
      price: '600.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    {
      '@type': 'Offer',
      name: 'Anual',
      price: '6000.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  ],
}

export const metadata = {
  title: 'Assine o MyNutri — Crie seu espaço com IA',
  description: '14 dias grátis para começar. Configure seu espaço com IA para seus clientes — sem cobrança agora.',
  alternates: {
    canonical: 'https://mynutri.pro/assinar',
  },
  openGraph: {
    title: 'Assine o MyNutri — Crie seu espaço com IA',
    url: 'https://mynutri.pro/assinar',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
}

export default async function AssinarPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { ref } = await searchParams
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
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
      <AssinarClient appDomain={appDomain} defaultEmail={user?.email ?? ""} defaultRef={ref ?? ""} />
    </>
  )
}
