"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { ChevronLeft } from "lucide-react"
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import posthog from 'posthog-js'
import { PRICING } from '@/lib/config/pricing'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'

type Plan = "monthly" | "yearly"
type SubdomainStatus = "idle" | "checking" | "available" | "unavailable" | "invalid"

interface Props {
  appDomain: string
  locale: string
  defaultEmail?: string
  defaultRef?: string
}

export default function AssinarClient({ appDomain, locale, defaultEmail = "", defaultRef = "" }: Props) {
  const router = useRouter()
  const t = useTranslations('Assinar')
  const [subdomain, setSubdomain] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState(defaultEmail)
  const [plan, setPlan] = useState<Plan>("yearly")
  const [subdomainStatus, setSubdomainStatus] = useState<SubdomainStatus>("idle")
  const [subdomainError, setSubdomainError] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/
  const pixelEventId = useRef(`vc_${Date.now()}_${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    posthog.capture('expert_viewed_pricing')
  }, [])

  useEffect(() => {
    const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq
    if (fbq) {
      fbq('track', 'ViewContent', { content_name: 'Página de Assinatura' }, { eventID: pixelEventId.current })
    }
  }, [])

  useEffect(() => {
    if (!subdomain) {
      setSubdomainStatus("idle")
      setSubdomainError("")
      return
    }

    if (!SUBDOMAIN_REGEX.test(subdomain)) {
      setSubdomainStatus("invalid")
      setSubdomainError(t('error_subdomain_invalid'))
      return
    }

    setSubdomainStatus("checking")
    setSubdomainError("")

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/assinar/check-subdomain?subdomain=${encodeURIComponent(subdomain)}`)
        const data = await res.json() as { available: boolean; error?: string }
        setSubdomainStatus(data.available ? "available" : "unavailable")
        if (!data.available) setSubdomainError(t('error_subdomain_taken'))
      } catch {
        setSubdomainStatus("idle")
      }
    }, 500)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (subdomainStatus !== "available" || loading) return

    setLoading(true)
    setError("")

    try {
      function getCookie(name: string): string {
        return document.cookie.split('; ').find(r => r.startsWith(`${name}=`))?.split('=').slice(1).join('=') ?? ''
      }

      const refCode = defaultRef || getCookie('ref_code') || ''

      let utmParams: Record<string, string> | undefined
      try {
        const raw = getCookie('utm_params')
        if (raw) utmParams = JSON.parse(decodeURIComponent(raw)) as Record<string, string>
      } catch { /* ignora */ }

      const res = await fetch("/api/assinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain,
          name,
          email,
          plan,
          locale,
          ref: refCode,
          utm: utmParams,
          fbc: getCookie('_fbc'),
          fbp: getCookie('_fbp'),
          pixel_event_id: `checkout_${Date.now()}`,
        }),
      })
      const data = await res.json() as { url?: string; error?: string }

      if (!res.ok || !data.url) {
        setError(data.error ?? t('error_payment'))
        return
      }

      posthog.capture('expert_started_checkout', { subdomain, plan, email })
      window.location.href = data.url
    } catch {
      setError(t('error_connection'))
    } finally {
      setLoading(false)
    }
  }

  const subdomainIndicator = () => {
    if (subdomainStatus === "checking") return <span className="text-xs text-muted-foreground">{t('subdomain_checking')}</span>
    if (subdomainStatus === "available") return <span className="text-xs text-emerald-600 font-medium">{t('subdomain_available')}</span>
    if (subdomainStatus === "unavailable" || subdomainStatus === "invalid") return <span className="text-xs text-destructive">{subdomainError}</span>
    return null
  }

  const canSubmit = subdomain && name && email && plan && subdomainStatus === "available" && !loading

  return (
    <main className="min-h-dvh bg-background max-w-2xl mx-auto px-6 py-10 flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="my-auto w-full max-w-sm mx-auto flex flex-col gap-8"
      >
        <div className="flex items-center justify-between -mb-4">
          <button
            onClick={() => router.push('/para-nutricionistas')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ChevronLeft size={14} />
            {t('back')}
          </button>
          <LocaleSwitcher />
        </div>

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight">MyNutri</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('header_desc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Subdomínio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t('subdomain_label')}</label>
            <div className="flex items-center border border-border rounded-xl bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 transition-shadow">
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder={t('subdomain_placeholder')}
                maxLength={30}
                className="flex-1 px-4 py-3 text-sm bg-transparent focus:outline-none min-w-0"
                autoComplete="off"
                autoCapitalize="none"
              />
              {appDomain && (
                <span className="px-3 py-3 text-sm text-muted-foreground bg-muted border-l border-border flex-shrink-0 select-none">
                  {t('subdomain_suffix')}
                </span>
              )}
            </div>
            <div className="h-4">{subdomainIndicator()}</div>
          </div>

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t('name_label')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('name_placeholder')}
              required
              className="px-4 py-3 text-sm border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t('email_label')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email_placeholder')}
              required
              className="px-4 py-3 text-sm border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
            />
          </div>

          {/* Seletor de plano */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t('plan_label')}</label>
            <div className="grid grid-cols-2 gap-3">
              {/* Mensal */}
              <button
                type="button"
                onClick={() => setPlan("monthly")}
                className={`flex flex-col gap-0.5 px-4 py-3.5 rounded-xl border text-left transition-all active:scale-[0.97] ${
                  plan === "monthly"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <span className="text-xs text-muted-foreground font-medium">{t('plan_monthly')}</span>
                <span className="text-lg font-bold tracking-tight">{PRICING.monthly.display}</span>
                <span className="text-xs text-muted-foreground">{t('plan_per_month')}</span>
              </button>

              {/* Anual */}
              <button
                type="button"
                onClick={() => setPlan("yearly")}
                className={`flex flex-col gap-0.5 px-4 py-3.5 rounded-xl border text-left relative transition-all active:scale-[0.97] ${
                  plan === "yearly"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <span className="absolute top-2 right-2 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  {t('plan_yearly_badge')}
                </span>
                <span className="text-xs text-muted-foreground font-medium">{t('plan_yearly')}</span>
                <span className="text-lg font-bold tracking-tight">{PRICING.yearly.display}</span>
                <span className="text-xs text-muted-foreground">{t('plan_per_year')} · {t('plan_yearly_label')}</span>
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">{error}</p>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? t('submit_loading') : t('submit')}
          </button>

          <p className="text-xs text-center text-muted-foreground">
            {t('trial_note')}
          </p>

          {/* Enterprise CTA */}
          {process.env.NEXT_PUBLIC_SALES_CALENDAR_URL && (
            <a
              href={process.env.NEXT_PUBLIC_SALES_CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 px-4 py-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
            >
              <span className="text-sm font-semibold">{t('enterprise_title')}</span>
              <span className="text-xs text-muted-foreground">{t('enterprise_desc')}</span>
              <span className="text-xs text-primary font-medium mt-1">{t('enterprise_cta')}</span>
            </a>
          )}
        </form>
      </motion.div>
    </main>
  )
}
