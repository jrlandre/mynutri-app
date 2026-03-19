"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Users, Brain, ChevronRight, ExternalLink } from "lucide-react"
import type { Expert } from "@/types"
import { toggleExpertStatus, changeExpertPlan } from "./actions"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  experts: Expert[]
  clientCountByExpert: Record<string, number>
  totalActiveClients: number
  usageTodayCount: number
}

// ─── Tab Visão Geral ──────────────────────────────────────────────────────────

function TabVisaoGeral({ experts, totalActiveClients, usageTodayCount }: {
  experts: Expert[]
  totalActiveClients: number
  usageTodayCount: number
}) {
  const activeExperts = experts.filter(e => e.active).length

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Experts ativos"
          value={String(activeExperts)}
          icon={<ChevronRight size={18} className="text-primary" />}
        />
        <StatCard
          label="Clientes totais"
          value={String(totalActiveClients)}
          icon={<Users size={18} className="text-primary" />}
        />
        <StatCard
          label="IA hoje"
          value={String(usageTodayCount)}
          icon={<Brain size={18} className="text-primary" />}
        />
        <StatCard
          label="God Mode"
          value="Ativo"
          icon={<ShieldCheck size={18} className="text-primary" />}
          highlight
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, highlight }: {
  label: string
  value: string
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl border px-5 py-4 flex flex-col gap-2 ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold tracking-tight ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  )
}

// ─── Tab Experts ──────────────────────────────────────────────────────────────

function TabExperts({ experts, clientCountByExpert }: {
  experts: Expert[]
  clientCountByExpert: Record<string, number>
}) {
  const [, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  function handleToggleStatus(expertId: string, newStatus: boolean) {
    setLoadingId(expertId + "-status")
    startTransition(async () => {
      await toggleExpertStatus(expertId, newStatus)
      setLoadingId(null)
    })
  }

  function handleChangePlan(expertId: string, newPlan: 'standard' | 'enterprise') {
    setLoadingId(expertId + "-plan")
    startTransition(async () => {
      await changeExpertPlan(expertId, newPlan)
      setLoadingId(null)
    })
  }

  return (
    <div className="flex flex-col gap-3 pt-4">
      {experts.map(expert => (
        <div
          key={expert.id}
          className={`rounded-2xl border border-border bg-card px-4 py-3 flex flex-col gap-3 transition-opacity ${!expert.active ? "opacity-50" : ""}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
              {expert.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-semibold truncate">{expert.name}</p>
                {expert.is_admin && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{expert.subdomain}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleChangePlan(expert.id, expert.plan === 'standard' ? 'enterprise' : 'standard')}
              disabled={!!loadingId}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                expert.plan === 'enterprise'
                  ? 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-400'
                  : 'bg-muted border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {loadingId === expert.id + "-plan" ? "..." : expert.plan}
            </button>

            <span className="text-xs text-muted-foreground">
              {clientCountByExpert[expert.id] ?? 0} clientes
            </span>

            <div className="flex-1" />

            <button
              onClick={() => handleToggleStatus(expert.id, !expert.active)}
              disabled={!!loadingId}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                expert.active
                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                  : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
              }`}
            >
              {loadingId === expert.id + "-status" ? "..." : expert.active ? "Ativo" : "Suspenso"}
            </button>
          </div>
        </div>
      ))}

      {experts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum expert cadastrado.</p>
      )}
    </div>
  )
}

// ─── Tab Cupons ───────────────────────────────────────────────────────────────

function TabCupons() {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="rounded-2xl border border-border bg-card px-5 py-8 flex flex-col gap-3 items-center text-center">
        <p className="text-sm font-semibold">Cupons e Promoções</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Crie, edite e acompanhe o uso de cupons diretamente no Stripe.
        </p>
        <a
          href="https://dashboard.stripe.com/promotion_codes"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-primary font-medium hover:opacity-70 transition-opacity"
        >
          Abrir no Stripe <ExternalLink size={14} />
        </a>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS = ["Visão Geral", "Experts", "Cupons"] as const
type Tab = typeof TABS[number]

export default function SudoClient({
  experts,
  clientCountByExpert,
  totalActiveClients,
  usageTodayCount,
}: Props) {
  const [tab, setTab] = useState<Tab>("Visão Geral")

  return (
    <div className="flex flex-col">
      <div className="sticky top-[49px] bg-background pt-4 pb-2 z-10">
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "Visão Geral" && (
            <TabVisaoGeral
              experts={experts}
              totalActiveClients={totalActiveClients}
              usageTodayCount={usageTodayCount}
            />
          )}
          {tab === "Experts" && (
            <TabExperts
              experts={experts}
              clientCountByExpert={clientCountByExpert}
            />
          )}
          {tab === "Cupons" && <TabCupons />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
