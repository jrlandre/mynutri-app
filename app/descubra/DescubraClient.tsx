'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.3, delay },
})

const STEPS = [
  {
    n: '1',
    title: 'Você cria seu espaço',
    desc: 'Escolhe um subdomínio exclusivo e configura a IA com o seu método, linguagem e foco.',
  },
  {
    n: '2',
    title: 'Convida seus clientes',
    desc: 'Envia um link de convite personalizado. Seus clientes criam conta e têm acesso imediato.',
  },
  {
    n: '3',
    title: 'Seus clientes usam',
    desc: 'Tiram dúvidas, pedem orientações e aprendem — com a IA configurada com as suas diretrizes, disponível 24h.',
  },
]

const FOOTER_LINKS = [
  { label: 'Experts parceiros', href: '/experts' },
  { label: 'Assinar', href: '/assinar' },
  { label: 'Suporte', href: 'mailto:suporte@mynutri.pro' },
  { label: 'Termos de uso', href: '/termos' },
  { label: 'Privacidade', href: '/privacidade' },
]

export function DescubraClient() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const source = params.get('utm_source')
    if (!source) return
    const utm = {
      utm_source: source,
      utm_medium: params.get('utm_medium') ?? '',
      utm_campaign: params.get('utm_campaign') ?? '',
      utm_content: params.get('utm_content') ?? '',
      utm_term: params.get('utm_term') ?? '',
    }
    const maxAge = 30 * 24 * 60 * 60
    document.cookie = `utm_params=${encodeURIComponent(JSON.stringify(utm))}; max-age=${maxAge}; path=/; samesite=lax`
  }, [])

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="max-w-2xl mx-auto w-full px-4 pt-5 pb-4 flex items-center justify-between">
        <span className="text-xl font-extrabold tracking-tight">MyNutri</span>
        <div className="flex items-center gap-2">
          <Link
            href="/auth"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/assinar"
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Assinar
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-4 pt-12 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
                Dê aos seus clientes<br />
                a IA que você configurou
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                Experts que querem oferecer algo diferente: uma IA personalizada
                para os seus pacientes — disponível 24h, no celular deles.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/assinar"
                className="px-6 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all text-center"
              >
                Criar meu espaço
              </Link>
              <a
                href="#como-funciona"
                className="px-6 py-3.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted active:scale-[0.98] transition-all text-center"
              >
                Ver como funciona
              </a>
            </div>
          </motion.div>
        </section>

        {/* ── Como funciona ─────────────────────────────────────────── */}
        <section id="como-funciona" className="max-w-2xl mx-auto px-4 py-12 border-t border-border">
          <motion.div {...fadeUp()} className="flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Como funciona</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Três passos para transformar seu atendimento.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.n}
                  {...fadeUp(i * 0.07)}
                  className="flex gap-4 p-5 rounded-2xl border border-border bg-card"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {step.n}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Para o cliente final ──────────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-4 py-12 border-t border-border">
          <motion.div
            {...fadeUp()}
            className="flex flex-col gap-6 rounded-2xl border border-border bg-secondary/40 p-6"
          >
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest">
                Para você, paciente
              </p>
              <h2 className="text-xl font-extrabold tracking-tight">
                O método do seu expert, disponível quando precisar
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No supermercado, na academia, às 23h. A IA responde com base nas diretrizes
                do seu expert — não com conselhos genéricos de internet.
              </p>
            </div>
            <Link
              href="/experts"
              className="self-start px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted active:scale-[0.98] transition-all"
            >
              Encontrar meu expert
            </Link>
          </motion.div>
        </section>

        {/* ── Preço ────────────────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-4 py-12 border-t border-border">
          <motion.div {...fadeUp()} className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">
                Preço simples, sem surpresas
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5 px-4 py-4 rounded-xl border border-border bg-card">
                <span className="text-xs text-muted-foreground font-medium">Mensal</span>
                <span className="text-2xl font-bold tracking-tight">R$249</span>
                <span className="text-xs text-muted-foreground">por mês</span>
              </div>
              <div className="relative flex flex-col gap-0.5 px-4 py-4 rounded-xl border border-primary bg-primary/5 ring-1 ring-primary">
                <span className="absolute top-2 right-2 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  −17%
                </span>
                <span className="text-xs text-muted-foreground font-medium">Anual</span>
                <span className="text-2xl font-bold tracking-tight">R$207,50</span>
                <span className="text-xs text-muted-foreground">por mês · R$2.490/ano</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/assinar"
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all text-center"
              >
                Começar agora
              </Link>
              <p className="text-xs text-center text-muted-foreground">
                Pagamento seguro via Stripe. Cancele quando quiser.
              </p>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Rodapé ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-8 flex flex-wrap gap-x-6 gap-y-2 justify-center">
          {FOOTER_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
