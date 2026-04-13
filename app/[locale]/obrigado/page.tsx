import Stripe from "stripe"
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { GTMScript } from "@/components/GTMScript"
import { ObrigadoClient } from "./ObrigadoClient"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Obrigado' })
  return {
    title: t('meta_title'),
    robots: { index: false },
    openGraph: {
      images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MyNutri' }],
    },
  }
}

interface Props {
  searchParams: Promise<{ session_id?: string }>
}

export default async function ObrigadoPage({ searchParams, params }: Props & { params: Promise<{ locale: string }> }) {
  const { session_id } = await searchParams
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Obrigado' })
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")

  let subdomain: string | null = null
  let amountBRL = 0
  let currency = "USD"

  if (session_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      const session = await stripe.checkout.sessions.retrieve(session_id)
      subdomain = session.metadata?.subdomain ?? null
      amountBRL = (session.amount_total ?? 0) / 100
      currency = session.currency?.toUpperCase() ?? "USD"
    } catch {
      // não bloqueia a página se a sessão não puder ser recuperada
    }
  }

  const panelUrl = subdomain && appDomain
    ? `https://${subdomain}.${appDomain}/painel`
    : null

  return (
    <>
      <GTMScript />
      {session_id && <ObrigadoClient value={amountBRL} currency={currency} transactionId={session_id} />}
      <main className="min-h-dvh bg-background max-w-sm mx-auto px-6 py-10 flex flex-col items-center">
        <div className="my-auto w-full flex flex-col items-center gap-6 text-center">
          <div className="text-4xl select-none">🎉</div>

          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-extrabold tracking-tight">{t('title')}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('desc')}</p>
          </div>

          {panelUrl && (
            <div className="w-full flex flex-col gap-2 p-4 rounded-xl border border-border bg-card text-left">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t('panel_label')}</p>
              <a
                href={panelUrl}
                className="text-sm font-medium text-primary hover:underline break-all"
              >
                {panelUrl}
              </a>
              <p className="text-xs text-muted-foreground">{t('panel_note')}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t('no_email')}</p>
        </div>
      </main>
    </>
  )
}
