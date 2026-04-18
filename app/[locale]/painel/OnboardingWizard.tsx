'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Expert } from '@/types'

interface Props {
  expert: Expert
  onComplete: () => void
}

const TOTAL_STEPS = 4

async function saveStep(step: number, completed = false) {
  await fetch('/api/painel/onboarding', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step, completed }),
  })
}

export default function OnboardingWizard({ expert, onComplete }: Props) {
  const t = useTranslations('Painel')
  const [step, setStep] = useState(expert.onboarding_step ?? 0)

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? 'mynutri.pro').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const publicPageUrl = `https://${expert.subdomain}.${appDomain}`

  async function handleNext() {
    const nextStep = step + 1
    await saveStep(nextStep)
    setStep(nextStep)
  }

  async function handleSkip() {
    await saveStep(TOTAL_STEPS, true)
    onComplete()
  }

  async function handleFinish() {
    await saveStep(TOTAL_STEPS, true)
    onComplete()
  }

  const steps = [
    {
      title: t('onboarding_step1_title'),
      desc: t('onboarding_step1_desc'),
      emoji: '👤',
      action: (
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
        >
          {t('onboarding_next')}
        </button>
      ),
    },
    {
      title: t('onboarding_step2_title'),
      desc: t('onboarding_step2_desc'),
      emoji: '🌐',
      action: (
        <div className="flex flex-col gap-3">
          <a
            href={publicPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted transition-colors text-center"
          >
            {t('onboarding_step2_view')} ↗
          </a>
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
          >
            {t('onboarding_next')}
          </button>
        </div>
      ),
    },
    {
      title: t('onboarding_step3_title'),
      desc: t('onboarding_step3_desc'),
      emoji: '📨',
      action: (
        <div className="flex flex-col gap-3">
          <button
            onClick={handleNext}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
          >
            {t('onboarding_step3_btn')}
          </button>
        </div>
      ),
    },
    {
      title: t('onboarding_step4_title'),
      desc: t('onboarding_step4_desc'),
      emoji: '🎉',
      action: (
        <button
          onClick={handleFinish}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
        >
          {t('onboarding_finish')}
        </button>
      ),
    },
  ]

  const current = steps[Math.min(step, TOTAL_STEPS - 1)]

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-background rounded-2xl border border-border shadow-xl overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Step indicator */}
          <p className="text-xs text-muted-foreground">
            {t('onboarding_progress', { current: step + 1, total: TOTAL_STEPS })}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              <span className="text-4xl">{current.emoji}</span>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-lg font-extrabold tracking-tight">{current.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{current.desc}</p>
              </div>
              {current.action}
            </motion.div>
          </AnimatePresence>

          {/* Skip button (step 1+) */}
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              {t('onboarding_skip')}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
