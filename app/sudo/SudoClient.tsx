"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Users, Brain, Trash2, Plus, X, ChevronRight } from "lucide-react"
import type { Expert, Coupon } from "@/types"
import {
  toggleExpertStatus,
  changeExpertPlan,
  createCoupon,
  deleteCoupon,
} from "./actions"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  experts: Expert[]
  coupons: Coupon[]
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
  const [pending, startTransition] = useTransition()
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
          {/* Linha superior: avatar + info */}
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

          {/* Linha inferior: ações */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Plano toggle */}
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

            {/* Clientes */}
            <span className="text-xs text-muted-foreground">
              {clientCountByExpert[expert.id] ?? 0} clientes
            </span>

            <div className="flex-1" />

            {/* Status toggle */}
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

function TabCupons({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const [coupons, setCoupons] = useState(initialCoupons)
  const [pending, startTransition] = useTransition()

  // Form state
  const [code, setCode] = useState("")
  const [discountPct, setDiscountPct] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [usageLimit, setUsageLimit] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!code || !discountPct) return
    const pct = parseInt(discountPct)
    if (isNaN(pct) || pct < 1 || pct > 100) {
      setFormError("Desconto deve ser entre 1 e 100%")
      return
    }
    setCreating(true)
    try {
      await createCoupon(
        code,
        pct,
        validUntil || undefined,
        usageLimit ? parseInt(usageLimit) : undefined,
      )
      setCode("")
      setDiscountPct("")
      setValidUntil("")
      setUsageLimit("")
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar cupom")
    }
    setCreating(false)
  }

  function handleDelete(couponId: string) {
    startTransition(async () => {
      await deleteCoupon(couponId)
      setCoupons(prev => prev.filter(c => c.id !== couponId))
      setConfirmDelete(null)
    })
  }

  const now = new Date()

  return (
    <div className="flex flex-col gap-5 pt-4">
      {/* Formulário de criação */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 flex flex-col gap-3">
        <p className="text-sm font-semibold">Novo cupom</p>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              required
              className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <div className="relative w-24">
              <input
                type="number"
                value={discountPct}
                onChange={e => setDiscountPct(e.target.value)}
                placeholder="10"
                min={1}
                max={100}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <input
              type="number"
              value={usageLimit}
              onChange={e => setUsageLimit(e.target.value)}
              placeholder="∞ usos"
              min={1}
              className="w-28 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <button
            type="submit"
            disabled={creating || !code || !discountPct}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Plus size={15} />
            {creating ? "Criando..." : "Criar cupom"}
          </button>
        </form>
      </div>

      {/* Lista de cupons */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Cupons</p>
        {coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum cupom criado ainda.</p>
        ) : (
          coupons.map(coupon => {
            const expired = coupon.valid_until ? new Date(coupon.valid_until) < now : false
            const isConfirming = confirmDelete === coupon.id

            return (
              <div key={coupon.id} className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{coupon.code}</span>
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      -{coupon.discount_pct}%
                    </span>
                    {expired && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                        Expirado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span>
                      {coupon.used_count} / {coupon.usage_limit ?? "∞"} usos
                    </span>
                    {coupon.valid_until && (
                      <>
                        <span>·</span>
                        <span>até {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete */}
                {isConfirming ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      disabled={pending}
                      className="text-xs font-medium text-destructive hover:opacity-70 disabled:opacity-40"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(coupon.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS = ["Visão Geral", "Experts", "Cupons"] as const
type Tab = typeof TABS[number]

export default function SudoClient({
  experts,
  coupons,
  clientCountByExpert,
  totalActiveClients,
  usageTodayCount,
}: Props) {
  const [tab, setTab] = useState<Tab>("Visão Geral")

  return (
    <div className="flex flex-col">
      {/* Tabs */}
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

      {/* Content */}
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
          {tab === "Cupons" && (
            <TabCupons initialCoupons={coupons} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
