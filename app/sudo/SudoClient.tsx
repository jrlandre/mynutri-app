"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Users, Brain, ChevronRight, ExternalLink, Copy, Check, X, Pencil } from "lucide-react"
import type { Expert } from "@/types"
import {
  toggleExpertStatus,
  changeExpertPlan,
  resendWelcomeEmail,
  createExpertBypass,
  setCommission,
  markReferralsPaid,
  setPromoterStatus,
  associateCouponToPromoter,
} from "./actions"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReferralRow {
  promoter_id: string
  commission_cents: number
  status: string
}

interface PromoterRow {
  id: string
  name: string
  referral_code: string | null
  stripe_coupon_id: string | null
  commissions: Array<{ percentage: number; valid_from: string; valid_until: string | null }>
}

interface Props {
  experts: Expert[]
  clientCountByExpert: Record<string, number>
  totalActiveClients: number
  usageTodayCount: number
  mrrCents: number
  totalToPayCents: number
  promoters: PromoterRow[]
  allReferrals: ReferralRow[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

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

// ─── Modal genérico ───────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="bg-background rounded-2xl border border-border w-full max-w-sm p-5 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{title}</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

// ─── Tab Visão Geral ──────────────────────────────────────────────────────────

function TabVisaoGeral({ experts, totalActiveClients, usageTodayCount, mrrCents, totalToPayCents }: {
  experts: Expert[]
  totalActiveClients: number
  usageTodayCount: number
  mrrCents: number
  totalToPayCents: number
}) {
  const activeExperts = experts.filter(e => e.active).length

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="MRR"
          value={formatBRL(mrrCents)}
          icon={<ChevronRight size={18} className="text-primary" />}
          highlight
        />
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
        />
        <StatCard
          label="Comissões a pagar"
          value={formatBRL(totalToPayCents)}
          icon={<ChevronRight size={18} className="text-primary" />}
        />
      </div>
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
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ email: "", name: "", subdomain: "", plan: "standard" as "standard" | "enterprise" })
  const [createError, setCreateError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "mynutri.pro").replace(/^https?:\/\//, "").replace(/\/$/, "")

  function handleToggleStatus(expertId: string, newStatus: boolean) {
    setLoadingId(expertId + "-status")
    startTransition(async () => {
      await toggleExpertStatus(expertId, newStatus)
      setLoadingId(null)
    })
  }

  function handleChangePlan(expertId: string, newPlan: "standard" | "enterprise") {
    setLoadingId(expertId + "-plan")
    startTransition(async () => {
      await changeExpertPlan(expertId, newPlan)
      setLoadingId(null)
    })
  }

  function handleResendWelcome(expertId: string) {
    setLoadingId(expertId + "-welcome")
    startTransition(async () => {
      await resendWelcomeEmail(expertId)
      setLoadingId(null)
    })
  }

  async function handleCreateBypass(e: React.FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    try {
      await createExpertBypass(createForm)
      setShowCreateForm(false)
      setCreateForm({ email: "", name: "", subdomain: "", plan: "standard" })
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erro ao criar expert")
    }
    setCreateLoading(false)
  }

  return (
    <div className="flex flex-col gap-3 pt-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateForm(true)}
          className="text-xs text-primary font-medium hover:opacity-70 transition-opacity"
        >
          + Criar expert sem billing
        </button>
      </div>

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
                {expert.is_promoter && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                    PROMOTER
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{expert.subdomain}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleChangePlan(expert.id, expert.plan === "standard" ? "enterprise" : "standard")}
              disabled={!!loadingId}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                expert.plan === "enterprise"
                  ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-400"
                  : "bg-muted border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {loadingId === expert.id + "-plan" ? "..." : expert.plan}
            </button>
            {expert.lifetime && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
                lifetime
              </span>
            )}

            <span className="text-xs text-muted-foreground">
              {clientCountByExpert[expert.id] ?? 0} clientes
            </span>

            <div className="flex-1" />

            <button
              onClick={() => handleToggleStatus(expert.id, !expert.active)}
              disabled={!!loadingId}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                expert.active
                  ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                  : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
              }`}
            >
              {loadingId === expert.id + "-status" ? "..." : expert.active ? "Ativo" : "Suspenso"}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap border-t border-border pt-2">
            <a
              href={`https://${expert.subdomain}.${appDomain}/painel`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
            >
              Acessar Painel <ExternalLink size={10} />
            </a>
            <span className="text-muted-foreground/40">·</span>
            <button
              onClick={() => handleResendWelcome(expert.id)}
              disabled={!!loadingId}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {loadingId === expert.id + "-welcome" ? "..." : "Reenviar boas-vindas"}
            </button>
            {expert.stripe_customer_id && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <a
                  href={`https://dashboard.stripe.com/customers/${expert.stripe_customer_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                >
                  Stripe <ExternalLink size={10} />
                </a>
              </>
            )}
          </div>
        </div>
      ))}

      {experts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum expert cadastrado.</p>
      )}

      {/* Criar expert sem billing modal */}
      <AnimatePresence>
        {showCreateForm && (
          <Modal title="Criar expert sem billing" onClose={() => setShowCreateForm(false)}>
            <form onSubmit={handleCreateBypass} className="flex flex-col gap-3">

              <input
                type="email"
                placeholder="Email"
                required
                value={createForm.email}
                onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <input
                type="text"
                placeholder="Nome"
                required
                value={createForm.name}
                onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <input
                type="text"
                placeholder="Subdomínio"
                required
                value={createForm.subdomain}
                onChange={e => setCreateForm(p => ({ ...p, subdomain: e.target.value }))}
                className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <select
                value={createForm.plan}
                onChange={e => setCreateForm(p => ({ ...p, plan: e.target.value as "standard" | "enterprise" }))}
                className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="standard">Standard</option>
                <option value="enterprise">Enterprise</option>
              </select>
              {createError && <p className="text-xs text-destructive">{createError}</p>}
              <button
                type="submit"
                disabled={createLoading}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {createLoading ? "Criando..." : "Criar expert"}
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Tab Promoters ────────────────────────────────────────────────────────────

function TabPromoters({ experts, promoters, allReferrals }: {
  experts: Expert[]
  promoters: PromoterRow[]
  allReferrals: ReferralRow[]
}) {
  const [, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showSetCommission, setShowSetCommission] = useState<string | null>(null)
  const [commissionForm, setCommissionForm] = useState({ percentage: "20", valid_from: new Date().toISOString().slice(0, 10), valid_until: "" })
  const [showSetPromoter, setShowSetPromoter] = useState<string | null>(null)
  const [promoterForm, setPromoterForm] = useState({ referral_code: "", is_promoter: true })
  const [commissionError, setCommissionError] = useState<string | null>(null)

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "mynutri.pro").replace(/^https?:\/\//, "").replace(/\/$/, "")

  function getReferralTotals(promoterId: string) {
    const rows = allReferrals.filter(r => r.promoter_id === promoterId)
    return {
      pending: rows.filter(r => r.status === "pending").reduce((s, r) => s + r.commission_cents, 0),
      cleared: rows.filter(r => r.status === "cleared").reduce((s, r) => s + r.commission_cents, 0),
      paid: rows.filter(r => r.status === "paid").reduce((s, r) => s + r.commission_cents, 0),
    }
  }

  function getCurrentPct(p: PromoterRow) {
    if (!p.commissions?.length) return 20
    const now = new Date()
    const active = p.commissions
      .filter(c => new Date(c.valid_from) <= now && (!c.valid_until || new Date(c.valid_until) > now))
      .sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime())
    return active[0]?.percentage ?? 20
  }

  function handleMarkPaid(promoterId: string) {
    setLoadingId(promoterId + "-paid")
    startTransition(async () => {
      await markReferralsPaid(promoterId)
      setLoadingId(null)
    })
  }

  async function handleSetCommission(e: React.FormEvent) {
    e.preventDefault()
    setCommissionError(null)
    const pct = parseFloat(commissionForm.percentage)
    if (isNaN(pct)) { setCommissionError("Percentual inválido"); return }
    try {
      await setCommission(
        showSetCommission!,
        pct,
        new Date(commissionForm.valid_from).toISOString(),
        commissionForm.valid_until ? new Date(commissionForm.valid_until).toISOString() : undefined
      )
      setShowSetCommission(null)
    } catch (err) {
      setCommissionError(err instanceof Error ? err.message : "Erro")
    }
  }

  async function handleSetPromoterSubmit(e: React.FormEvent) {
    e.preventDefault()
    await setPromoterStatus(showSetPromoter!, promoterForm.is_promoter, promoterForm.referral_code)
    setShowSetPromoter(null)
  }

  const nonPromoterExperts = experts.filter(e => !e.is_promoter && e.active)

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Promoters ativos</p>
        {nonPromoterExperts.length > 0 && (
          <button
            onClick={() => { setShowSetPromoter(nonPromoterExperts[0].id); setPromoterForm({ referral_code: "", is_promoter: true }) }}
            className="text-xs text-primary font-medium hover:opacity-70"
          >
            + Ativar promoter
          </button>
        )}
      </div>

      {promoters.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum promoter ativo.</p>
      )}

      {promoters.map(p => {
        const totals = getReferralTotals(p.id)
        const currentPct = getCurrentPct(p)
        return (
          <div key={p.id} className="rounded-2xl border border-border bg-card px-4 py-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{p.name}</p>
                {p.referral_code && (
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-muted-foreground font-mono">
                      {appDomain}/r/{p.referral_code}
                    </p>
                    <button
                      onClick={() => {
                        setShowSetPromoter(p.id)
                        setPromoterForm({ referral_code: p.referral_code || "", is_promoter: true })
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Pencil size={10} />
                    </button>
                  </div>
                )}
              </div>
              <span className="text-sm font-bold text-primary">{currentPct}%</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted px-2 py-1.5">
                <p className="text-[10px] text-muted-foreground">Pendente</p>
                <p className="text-xs font-semibold">{formatBRL(totals.pending)}</p>
              </div>
              <div className="rounded-xl bg-muted px-2 py-1.5">
                <p className="text-[10px] text-muted-foreground">A pagar</p>
                <p className="text-xs font-semibold text-amber-600">{formatBRL(totals.cleared)}</p>
              </div>
              <div className="rounded-xl bg-muted px-2 py-1.5">
                <p className="text-[10px] text-muted-foreground">Pago</p>
                <p className="text-xs font-semibold text-green-600">{formatBRL(totals.paid)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSetCommission(p.id)
                  setCommissionForm({ percentage: String(currentPct), valid_from: new Date().toISOString().slice(0, 10), valid_until: "" })
                }}
                className="flex-1 py-1.5 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors"
              >
                Configurar %
              </button>
              {totals.cleared > 0 && (
                <button
                  onClick={() => handleMarkPaid(p.id)}
                  disabled={loadingId === p.id + "-paid"}
                  className="flex-1 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {loadingId === p.id + "-paid" ? "..." : `Marcar pago (${formatBRL(totals.cleared)})`}
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* Modal configurar % */}
      <AnimatePresence>
        {showSetCommission && (
          <Modal title="Configurar comissão" onClose={() => setShowSetCommission(null)}>
            <form onSubmit={handleSetCommission} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Percentual (%)</label>
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={commissionForm.percentage}
                  onChange={e => setCommissionForm(p => ({ ...p, percentage: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Válido a partir de</label>
                <input
                  type="date"
                  value={commissionForm.valid_from}
                  onChange={e => setCommissionForm(p => ({ ...p, valid_from: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Válido até (opcional)</label>
                <input
                  type="date"
                  value={commissionForm.valid_until}
                  onChange={e => setCommissionForm(p => ({ ...p, valid_until: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              {commissionError && <p className="text-xs text-destructive">{commissionError}</p>}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Salvar
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Modal ativar/editar promoter */}
      <AnimatePresence>
        {showSetPromoter && (
          <Modal title={promoters.find(p => p.id === showSetPromoter) ? "Editar promoter" : "Ativar promoter"} onClose={() => setShowSetPromoter(null)}>
            <form onSubmit={handleSetPromoterSubmit} className="flex flex-col gap-3">
              {!promoters.find(p => p.id === showSetPromoter) && (
                <select
                  value={showSetPromoter}
                  onChange={e => setShowSetPromoter(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {nonPromoterExperts.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.subdomain})</option>
                  ))}
                </select>
              )}
              
              {promoters.find(p => p.id === showSetPromoter) && (
                <p className="text-sm font-medium px-1">{promoters.find(p => p.id === showSetPromoter)?.name}</p>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground ml-1">Código de referral</label>
                <input
                  type="text"
                  placeholder="Ex: ana"
                  value={promoterForm.referral_code}
                  onChange={e => setPromoterForm(p => ({ ...p, referral_code: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Salvar
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Tab Cupons ───────────────────────────────────────────────────────────────

function TabCupons({ promoters }: { promoters: PromoterRow[] }) {
  const [associatePromoter, setAssociatePromoter] = useState("")
  const [associateCouponId, setAssociateCouponId] = useState("")
  const [assocLoading, setAssocLoading] = useState(false)
  const [assocSuccess, setAssocSuccess] = useState(false)

  async function handleAssociate(e: React.FormEvent) {
    e.preventDefault()
    setAssocLoading(true)
    try {
      await associateCouponToPromoter(associatePromoter, associateCouponId)
      setAssocSuccess(true)
      setTimeout(() => setAssocSuccess(false), 2000)
    } catch {
      // ignore
    }
    setAssocLoading(false)
  }

  return (
    <div className="flex flex-col gap-5 pt-4">
      <div className="flex justify-center">
        <a
          href="https://dashboard.stripe.com/promotion_codes"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline transition-all"
        >
          Gerenciar no Stripe <ExternalLink size={14} />
        </a>
      </div>

      <div className="rounded-2xl border border-border bg-card px-5 py-4 flex flex-col gap-4">
        <p className="text-sm font-semibold">Associar cupom a promoter</p>
        <form onSubmit={handleAssociate} className="flex flex-col gap-3">
          <select
            value={associatePromoter}
            onChange={e => setAssociatePromoter(e.target.value)}
            required
            className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="">Selecionar promoter</option>
            {promoters.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Stripe Coupon ID"
            required
            value={associateCouponId}
            onChange={e => setAssociateCouponId(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={assocLoading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {assocSuccess ? <><Check size={14} /> Associado</> : assocLoading ? "..." : "Associar"}
          </button>
        </form>
      </div>

      {promoters.filter(p => p.stripe_coupon_id).length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Cupons associados</p>
          {promoters.filter(p => p.stripe_coupon_id).map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs font-mono text-muted-foreground">{p.stripe_coupon_id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS = ["Visão Geral", "Experts", "Promoters", "Cupons"] as const
type Tab = typeof TABS[number]

export default function SudoClient({
  experts,
  clientCountByExpert,
  totalActiveClients,
  usageTodayCount,
  mrrCents,
  totalToPayCents,
  promoters,
  allReferrals,
}: Props) {
  const [tab, setTab] = useState<Tab>("Visão Geral")

  return (
    <div className="flex flex-col">
      <div className="sticky top-[49px] bg-background pt-4 pb-2 z-10">
        <div className="flex gap-1 bg-muted rounded-xl p-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap px-2 ${
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
              mrrCents={mrrCents}
              totalToPayCents={totalToPayCents}
            />
          )}
          {tab === "Experts" && (
            <TabExperts
              experts={experts}
              clientCountByExpert={clientCountByExpert}
            />
          )}
          {tab === "Promoters" && (
            <TabPromoters
              experts={experts}
              promoters={promoters}
              allReferrals={allReferrals}
            />
          )}
          {tab === "Cupons" && (
            <TabCupons promoters={promoters} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
