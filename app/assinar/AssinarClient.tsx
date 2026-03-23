"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"

type Plan = "monthly" | "yearly"

type SubdomainStatus = "idle" | "checking" | "available" | "unavailable" | "invalid"

interface Props {
  appDomain: string
  defaultEmail?: string
}

export default function AssinarClient({ appDomain, defaultEmail = "" }: Props) {
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

  useEffect(() => {
    if (!subdomain) {
      setSubdomainStatus("idle")
      setSubdomainError("")
      return
    }

    if (!SUBDOMAIN_REGEX.test(subdomain)) {
      setSubdomainStatus("invalid")
      setSubdomainError("Use apenas letras minúsculas, números e hífen (3–30 caracteres).")
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
        if (!data.available) setSubdomainError("Este subdomínio já está em uso.")
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
      const res = await fetch("/api/assinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain, name, email, plan }),
      })
      const data = await res.json() as { url?: string; error?: string }

      if (!res.ok || !data.url) {
        setError(data.error ?? "Erro ao iniciar pagamento. Tente novamente.")
        return
      }

      window.location.href = data.url
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const subdomainIndicator = () => {
    if (subdomainStatus === "checking") return <span className="text-xs text-muted-foreground">Verificando...</span>
    if (subdomainStatus === "available") return <span className="text-xs text-emerald-600 font-medium">Disponível ✓</span>
    if (subdomainStatus === "unavailable" || subdomainStatus === "invalid") return <span className="text-xs text-destructive">{subdomainError}</span>
    return null
  }

  const canSubmit = subdomain && name && email && plan && subdomainStatus === "available" && !loading

  return (
    <main className="min-h-dvh bg-background max-w-sm mx-auto px-6 py-10 flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="my-auto flex flex-col gap-8"
      >
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight">MyNutri</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Seu espaço personalizado com IA para atender pacientes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Subdomínio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Seu endereço exclusivo</label>
            <div className="flex items-center border border-border rounded-xl bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 transition-shadow">
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="seu-nome"
                maxLength={30}
                className="flex-1 px-4 py-3 text-sm bg-transparent focus:outline-none min-w-0"
                autoComplete="off"
                autoCapitalize="none"
              />
              {appDomain && (
                <span className="px-3 py-3 text-sm text-muted-foreground bg-muted border-l border-border flex-shrink-0 select-none">
                  .{appDomain}
                </span>
              )}
            </div>
            <div className="h-4">{subdomainIndicator()}</div>
          </div>

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Nome completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dra. Ana Souza"
              required
              className="px-4 py-3 text-sm border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ana@clinica.com.br"
              required
              className="px-4 py-3 text-sm border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
            />
          </div>

          {/* Seletor de plano */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Plano</label>
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
                <span className="text-xs text-muted-foreground font-medium">Mensal</span>
                <span className="text-lg font-bold tracking-tight">R$249</span>
                <span className="text-xs text-muted-foreground">por mês</span>
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
                  -17%
                </span>
                <span className="text-xs text-muted-foreground font-medium">Anual</span>
                <span className="text-lg font-bold tracking-tight">R$207,50</span>
                <span className="text-xs text-muted-foreground">por mês · R$2.490/ano</span>
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
            {loading ? "Aguarde..." : "Assinar e configurar meu espaço"}
          </button>

          <p className="text-xs text-center text-muted-foreground">
            Pagamento seguro via Stripe. Cancele quando quiser.
          </p>
        </form>
      </motion.div>
    </main>
  )
}
