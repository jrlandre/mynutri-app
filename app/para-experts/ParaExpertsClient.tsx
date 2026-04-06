'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.3, delay },
})

const EXPERT_BENEFITS = [
  {
    title: 'Subdomínio exclusivo',
    desc: 'seunome.mynutri.pro — para o cliente, é 100% a sua marca e a sua tecnologia.',
  },
  {
    title: 'Pare de responder o óbvio',
    desc: 'Dúvidas triviais ficam com a IA; o seu tempo vai para o que só você faz.',
  },
  {
    title: 'A IA segue o seu protocolo',
    desc: 'Não inventa, não improvisa, não sai da sua metodologia.',
  },
  {
    title: 'Vender mais ficou mais fácil',
    desc: '"Acesso 24h à minha IA exclusiva" justifica e eleva o seu preço.',
  },
  {
    title: 'Atenda 10 ou 1.000',
    desc: 'Sem perder qualidade, precisão técnica ou a sua identidade.',
  },
]

const CLIENT_BENEFITS = [
  {
    title: 'O especialista no bolso, 24h',
    desc: 'Dúvida no supermercado, na academia, à meia-noite: respondida.',
  },
  {
    title: 'Resposta em segundos',
    desc: 'Sem esperar retorno no WhatsApp ou a próxima consulta.',
  },
  {
    title: 'Estritamente dentro da sua metodologia',
    desc: 'Sem achismo, sem internet, só o protocolo do especialista.',
  },
  {
    title: 'Sem margem para erro',
    desc: 'Substituição de alimento, cardápio de restaurante, leitura de rótulo, na hora.',
  },
  {
    title: 'Resultado mais rápido',
    desc: 'Menos dúvida, menos erro, mais execução do plano.',
  },
]

const STEPS = [
  {
    n: '1',
    title: 'Instrua a sua IA',
    desc: 'Com as suas próprias palavras, você define o protocolo: método, prioridades, estilo de resposta.',
  },
  {
    n: '2',
    title: 'Ative o seu espaço',
    desc: 'Seu ecossistema pronto em minutos. Subdomínio exclusivo, painel de gestão, convites personalizados.',
  },
  {
    n: '3',
    title: 'Abra para os clientes',
    desc: 'Seus clientes acessam com o link de convite. A IA responde por você — sem você estar lá.',
  },
]

const FOOTER_LINKS = [
  { label: 'Experts parceiros', href: '/experts' },
  { label: 'Assinar', href: '/assinar' },
  { label: 'Suporte', href: 'mailto:suporte@mynutri.pro' },
  { label: 'Termos de uso', href: '/termos' },
  { label: 'Privacidade', href: '/privacidade' },
]

export function ParaExpertsClient() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="max-w-2xl mx-auto w-full px-4 pt-5 pb-4 flex items-center justify-between">
        <Link href="/descubra" className="text-xl font-extrabold tracking-tight hover:opacity-80 transition-opacity">
          MyNutri
        </Link>
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
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                Para experts
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
                A sua IA. Para cada cliente.<br />
                Ao mesmo tempo.
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                Configure uma vez. Seus clientes têm respostas 24h com o seu protocolo.
                Você expande, sem se dividir.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/assinar"
                className="self-start px-6 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Grátis por 14 dias
              </Link>
              <p className="text-xs text-muted-foreground">
                Sem cobrança agora. Cancele a qualquer momento.
              </p>
            </div>
          </motion.div>
        </section>

        {/* TODO: [backlog] vídeo de demo do painel */}

        {/* ── O que você ganha como expert ─────────────────────────── */}
        <section className="max-w-2xl mx-auto px-4 py-12 border-t border-border">
          <motion.div {...fadeUp()} className="flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">O que você ganha</h2>
              <p className="text-sm text-muted-foreground mt-1">Como expert no O MyNutri.</p>
            </div>
            <div className="flex flex-col gap-3">
              {EXPERT_BENEFITS.map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp(i * 0.06)}
                  className="flex gap-4 p-5 rounded-2xl border border-border bg-card"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── O que seus clientes ganham ────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-4 py-12 border-t border-border">
          <motion.div {...fadeUp()} className="flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">O que seus clientes ganham</h2>
              <p className="text-sm text-muted-foreground mt-1">A experiência do lado deles.</p>
            </div>
            <div className="flex flex-col gap-3">
              {CLIENT_BENEFITS.map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp(i * 0.06)}
                  className="flex gap-4 p-5 rounded-2xl border border-border bg-secondary/40"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Como funciona ─────────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-4 py-12 border-t border-border">
          <motion.div {...fadeUp()} className="flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">
                Três passos para escalar sua metodologia.
              </h2>
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

        {/* ── Fechamento ───────────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-4 py-12 border-t border-border">
          <motion.div
            {...fadeUp()}
            className="flex flex-col gap-6 rounded-2xl border border-border bg-secondary/40 p-8"
          >
            <div className="flex flex-col gap-3">
              <p className="text-lg font-extrabold tracking-tight leading-snug">
                Construída para quem tem método.<br />
                Não para quem improvisa.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                O MyNutri não dita as regras — ele executa as suas. Para cada cliente. Ao mesmo tempo.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/assinar"
                className="self-start px-6 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Grátis por 14 dias →
              </Link>
              <p className="text-xs text-muted-foreground">
                Sem cobrança agora. Cancele a qualquer momento.
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
