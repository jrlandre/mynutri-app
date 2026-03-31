import Stripe from "stripe"
import Link from "next/link"
import { GTMScript } from "@/components/GTMScript"
import { ObrigadoClient } from "./ObrigadoClient"

interface Props {
  searchParams: Promise<{ session_id?: string }>
}

export const metadata = {
  title: "Cadastro confirmado — MyNutri",
  openGraph: {
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MyNutri' }],
  },
}

export default async function ObrigadoPage({ searchParams }: Props) {
  const { session_id } = await searchParams
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")

  let subdomain: string | null = null
  let amountBRL = 0
  let currency = "BRL"

  if (session_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      const session = await stripe.checkout.sessions.retrieve(session_id)
      subdomain = session.metadata?.subdomain ?? null
      amountBRL = (session.amount_total ?? 0) / 100
      currency = session.currency?.toUpperCase() ?? "BRL"
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
            <h1 className="text-xl font-extrabold tracking-tight">Boas-vindas ao MyNutri!</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Seu cadastro foi confirmado. Verifique seu e-mail — enviamos o link de acesso ao seu painel.
            </p>
          </div>

          {panelUrl && (
            <div className="w-full flex flex-col gap-2 p-4 rounded-xl border border-border bg-card text-left">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Seu painel</p>
              <Link
                href={panelUrl}
                className="text-sm font-medium text-primary hover:underline break-all"
              >
                {panelUrl}
              </Link>
              <p className="text-xs text-muted-foreground">
                O acesso será liberado após confirmar o e-mail.
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Não recebeu o e-mail? Verifique a caixa de spam ou entre em contato com o suporte.
          </p>
        </div>
      </main>
    </>
  )
}
