'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.3, delay },
})

export function ParaExpertsClient() {
  const t = useTranslations('ParaExperts')

  const EXPERT_BENEFITS = [
    { title: t('expert_benefit_1_title'), desc: t('expert_benefit_1_desc') },
    { title: t('expert_benefit_2_title'), desc: t('expert_benefit_2_desc') },
    { title: t('expert_benefit_3_title'), desc: t('expert_benefit_3_desc') },
    { title: t('expert_benefit_4_title'), desc: t('expert_benefit_4_desc') },
    { title: t('expert_benefit_5_title'), desc: t('expert_benefit_5_desc') },
  ]

  const CLIENT_BENEFITS = [
    { title: t('client_benefit_1_title'), desc: t('client_benefit_1_desc') },
    { title: t('client_benefit_2_title'), desc: t('client_benefit_2_desc') },
    { title: t('client_benefit_3_title'), desc: t('client_benefit_3_desc') },
    { title: t('client_benefit_4_title'), desc: t('client_benefit_4_desc') },
    { title: t('client_benefit_5_title'), desc: t('client_benefit_5_desc') },
  ]

  const STEPS = [
    { n: '1', title: t('step_1_title'), desc: t('step_1_desc') },
    { n: '2', title: t('step_2_title'), desc: t('step_2_desc') },
    { n: '3', title: t('step_3_title'), desc: t('step_3_desc') },
  ]

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="max-w-2xl mx-auto w-full px-4 pt-5 pb-4 flex items-center justify-between">
        <Link href="/descubra" className="text-xl font-extrabold tracking-tight hover:opacity-80 transition-opacity">
          MyNutri
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <Link
            href="/auth"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('nav_enter')}
          </Link>
          <Link
            href="/assinar"
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {t('nav_subscribe')}
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
            className="flex flex-col gap-6 items-center text-center"
          >
            <div className="flex flex-col gap-3 items-center">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                {t('badge')}
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight leading-tight whitespace-pre-line">
                {t('hero_title')}
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                {t('hero_subtitle')}
              </p>
            </div>
            <div className="flex flex-col gap-2 items-center">
              <Link
                href="/assinar"
                className="px-6 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {t('cta_trial')}
              </Link>
              <p className="text-xs text-muted-foreground">{t('cta_trial_note')}</p>
            </div>
          </motion.div>
        </section>

        {/* ── O que você ganha como expert ─────────────────────────── */}
        <section className="max-w-2xl mx-auto px-4 py-12 border-t border-border">
          <motion.div {...fadeUp()} className="flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">{t('section_expert_title')}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('section_expert_sub')}</p>
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
              <h2 className="text-xl font-extrabold tracking-tight">{t('section_client_title')}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('section_client_sub')}</p>
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
              <h2 className="text-xl font-extrabold tracking-tight">{t('section_steps_title')}</h2>
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
              <p className="text-lg font-extrabold tracking-tight leading-snug whitespace-pre-line">
                {t('closing_title')}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{t('closing_desc')}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/assinar"
                className="self-start px-6 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {t('cta_closing')}
              </Link>
              <p className="text-xs text-muted-foreground">{t('cta_trial_note')}</p>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Rodapé ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-8 flex flex-wrap gap-x-6 gap-y-2 justify-center">
          <Link href="/experts" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('footer_partners')}
          </Link>
          <Link href="/assinar" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('footer_subscribe')}
          </Link>
          <a href="mailto:suporte@mynutri.pro" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('footer_support')}
          </a>
          <Link href="/termos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('footer_terms')}
          </Link>
          <Link href="/privacidade" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('footer_privacy')}
          </Link>
        </div>
      </footer>
    </div>
  )
}
