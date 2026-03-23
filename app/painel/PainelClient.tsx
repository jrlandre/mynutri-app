"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X, Trash2, Check, Upload, Link2, ChevronLeft, Copy, Pause, Play } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { compressImage } from "@/lib/compress-image"
import type { Expert, Client, ContactLink, Referral } from "@/types"
import { CLIENT_LIMIT as PLAN_LIMIT } from "@/lib/plans"
const CONTACT_TYPES = ["WhatsApp", "Instagram", "E-mail", "Website"] as const

interface Props {
  expert: Expert
  initialClients: Client[]
  initialReferrals: Referral[]
}

// ─── Aba Início ──────────────────────────────────────────────────────────────

function TabInicio({ expert, clients, onInvite, onToggleActive }: {
  expert: Expert
  clients: Client[]
  onInvite: (email: string) => Promise<{ invite_url?: string; error?: string }>
  onToggleActive: (id: string, active: boolean) => Promise<void>
}) {
  const limit = PLAN_LIMIT[expert.plan] ?? 50
  const activeClients = clients.filter(p => p.active)
  const inactiveClients = clients.filter(p => !p.active)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url?: string; error?: string } | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [copiedInvite, setCopiedInvite] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteResult(null)
    const result = await onInvite(inviteEmail)
    setInviteResult({ url: result.invite_url, error: result.error })
    if (!result.error) setInviteEmail("")
    setInviteLoading(false)
  }

  async function handleToggle(id: string, currentStatus: boolean) {
    setToggling(id)
    await onToggleActive(id, !currentStatus)
    setToggling(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Card de vagas */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Clientes ativos</p>
          <p className="text-2xl font-bold tracking-tight mt-0.5">
            {activeClients.length}
            <span className="text-base font-normal text-muted-foreground">
              {" "}/ {isFinite(limit) ? limit : "∞"}
            </span>
          </p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setInviteResult(null) }}
          disabled={isFinite(limit) && activeClients.length >= limit}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Gerar convite
        </button>
      </div>

      {/* Gerenciar assinatura */}
      <div className="flex justify-end -mt-4">
        <button
          onClick={async () => {
            const res = await fetch('/api/painel/billing', { method: 'POST' })
            const { url } = await res.json()
            if (url) window.location.href = url
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="underline underline-offset-2">Gerenciar assinatura</span> ↗
        </button>
      </div>

      {/* Modal de convite */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-border bg-card px-5 py-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Novo convite</p>
              <button onClick={() => { setShowInvite(false); setInviteResult(null) }} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@cliente.com"
                required
                className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {inviteLoading ? "..." : "Gerar"}
              </button>
            </form>
            {inviteResult?.error && (
              <p className="text-xs text-destructive">{inviteResult.error}</p>
            )}
            {inviteResult?.url && (
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
                <Link2 size={14} className="text-muted-foreground shrink-0" />
                <p className="text-xs truncate flex-1 font-mono">{inviteResult.url}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteResult.url!); setCopiedInvite(true); setTimeout(() => setCopiedInvite(false), 2000) }}
                  className="text-xs text-primary font-medium hover:opacity-70 shrink-0 flex items-center gap-1"
                >
                  {copiedInvite ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listas de clientes */}
      <div className="flex flex-col gap-8">
        {/* Ativos */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2 px-1">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Ativos</p>
            <span className="text-xs font-medium text-muted-foreground/50">{activeClients.length}</span>
          </div>
          {activeClients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center border-2 border-dashed border-border rounded-2xl">
              Nenhum cliente ativo.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {activeClients.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0 text-primary">
                    {(p.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.email ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.activated_at ? "Ativo" : "Convite pendente"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle(p.id, true)}
                    disabled={toggling === p.id}
                    title="Pausar acesso"
                    className="p-2 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                  >
                    <Pause size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inativos */}
        {inactiveClients.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2 px-1">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Pausados</p>
              <span className="text-xs font-medium text-muted-foreground/50">{inactiveClients.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {inactiveClients.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card opacity-60">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0 text-muted-foreground">
                    {(p.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.email ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Acesso desativado</p>
                  </div>
                  <button
                    onClick={() => handleToggle(p.id, false)}
                    disabled={toggling === p.id}
                    title="Reativar acesso"
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-40"
                  >
                    <Play size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Aba Vitrine ──────────────────────────────────────────────────────────────

function TabVitrine({ expert, onSave, onPhotoChange }: {
  expert: Expert
  onSave: (data: Partial<Expert>) => Promise<void>
  onPhotoChange: (url: string) => void
}) {
  const [name, setName] = useState(expert.name)
  const [specialty, setSpecialty] = useState(expert.specialty ?? "")
  const [city, setCity] = useState(expert.city ?? "")
  const [listed, setListed] = useState(expert.listed)
  const [links, setLinks] = useState<ContactLink[]>(expert.contact_links ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const linksContainerRef = useRef<HTMLDivElement>(null)

  // Autoscroll quando adicionar link
  useEffect(() => {
    if (links.length > (expert.contact_links?.length ?? 0)) {
      // Scroll suave para o último link adicionado
      setTimeout(() => {
        const lastLink = linksContainerRef.current?.lastElementChild
        if (lastLink) {
          lastLink.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links.length])

  // Photo
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(expert.photo_url)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)
    setUploadingPhoto(true)
    
    try {
      const preview = URL.createObjectURL(file)
      setPhotoPreview(preview)
      
      const base64 = await compressImage(file)
      const res = await fetch("/api/painel/photo", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: base64, mimeType: "image/jpeg" })
      })
      const data = await res.json() as { photo_url?: string; error?: string }
      
      if (data.error) {
        setPhotoError(data.error)
        setPhotoPreview(expert.photo_url)
      } else if (data.photo_url) {
        setPhotoPreview(data.photo_url)
        onPhotoChange(data.photo_url)
      }
    } catch (err) {
      setPhotoError("Erro ao processar imagem")
      setPhotoPreview(expert.photo_url)
    } finally {
      setUploadingPhoto(false)
    }
  }

  function addLink() {
    setLinks(prev => [...prev, { type: "whatsapp", label: "", url: "" }])
  }

  function removeLink(i: number) {
    setLinks(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateLink(i: number, field: keyof ContactLink, value: string) {
    setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    
    // Fallback: se o rótulo estiver vazio, usa o tipo diretamente
    const processedLinks = links.map(link => ({
      ...link,
      label: link.label.trim() || link.type
    }))
      
    await onSave({ 
      name, 
      specialty: specialty || null, 
      city: city || null, 
      listed, 
      contact_links: processedLinks
    })
    
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasChanges = 
    name !== expert.name ||
    specialty !== (expert.specialty ?? "") ||
    city !== (expert.city ?? "") ||
    listed !== expert.listed ||
    JSON.stringify(links) !== JSON.stringify(expert.contact_links ?? [])

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* Foto */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Foto de perfil</p>
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-full border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary transition-colors shrink-0"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <Upload size={20} className="text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="text-sm text-primary font-medium hover:opacity-70 transition-opacity disabled:opacity-50 text-left"
            >
              {uploadingPhoto ? "Enviando..." : "Alterar foto"}
            </button>
            {photoError && <p className="text-xs text-destructive">{photoError}</p>}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
      </div>

      {/* Campos */}
      <Field label="Nome" value={name} onChange={setName} required />
      <Field label="Especialidade" value={specialty} onChange={setSpecialty} placeholder="Ex: Nutrição Esportiva" />
      <Field label="Cidade" value={city} onChange={setCity} placeholder="Ex: São Paulo - SP" />

      {/* Perfil toggle */}
      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-sm font-medium">Exibir perfil</p>
          <p className="text-xs text-muted-foreground">Aparecer na página /experts para novos clientes</p>
        </div>
        <button
          type="button"
          onClick={() => setListed(v => !v)}
          className={`w-11 h-6 rounded-full transition-colors relative ${listed ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${listed ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      {/* Links de contato */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Links de contato</p>
          <button type="button" onClick={addLink} className="text-xs text-primary font-medium hover:opacity-70 flex items-center gap-1">
            <Plus size={14} /> Adicionar
          </button>
        </div>
        
        {links.length === 0 ? (
          <div className="py-4 text-center border-2 border-dashed border-border rounded-2xl">
            <p className="text-xs text-muted-foreground">Nenhum link adicionado</p>
          </div>
        ) : (
          <div ref={linksContainerRef} className="flex flex-col gap-3">
            {links.map((link, i) => (
              <div key={i} className="relative p-4 rounded-2xl bg-muted/30 border border-border flex flex-col gap-3 group">
                <button 
                  type="button" 
                  onClick={() => removeLink(i)} 
                  className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Remover link"
                >
                  <Trash2 size={14} />
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Tipo</label>
                    <div className="relative">
                      <select
                        value={link.type}
                        onChange={e => updateLink(i, "type", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 appearance-none pr-8"
                      >
                        {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronLeft size={14} className="absolute right-3 top-1/2 -translate-y-1/2 -rotate-90 pointer-events-none text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Rótulo (opcional)</label>
                    <input
                      value={link.label}
                      onChange={e => updateLink(i, "label", e.target.value)}
                      placeholder="Ex: WhatsApp"
                      className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">URL / Link</label>
                  <input
                    value={link.url}
                    onChange={e => updateLink(i, "url", e.target.value)}
                    placeholder="https://..."
                    className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || !hasChanges || !name.trim()}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saved ? <><Check size={18} /> Salvo com sucesso</> : saving ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  )
}

// ─── Aba IA ───────────────────────────────────────────────────────────────────

function TabIA({ expert, onSave }: {
  expert: Expert
  onSave: (data: Partial<Expert>) => Promise<void>
}) {
  const [prompt, setPrompt] = useState(expert.system_prompt ?? "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ system_prompt: prompt || null })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasChanges = prompt !== (expert.system_prompt ?? "")

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold">Prompt personalizado</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Este texto é enviado à IA antes de cada análise dos seus clientes. Use para definir tom, foco e restrições ou orientações específicas da sua abordagem.
        </p>
      </div>
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Ex: Você é um expert especializado em performance humana. Priorize sempre dados baseados em evidências…"
        rows={10}
        className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none leading-relaxed"
      />
      <button
        type="submit"
        disabled={saving || !hasChanges}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saved ? <><Check size={18} /> Salvo com sucesso</> : saving ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  )
}

// ─── Aba Comissões ────────────────────────────────────────────────────────────

function TabComissoes({ expert, referrals }: {
  expert: Expert
  referrals: Referral[]
}) {
  const [promoCode, setPromoCode] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "mynutri.pro").replace(/^https?:\/\//, "").replace(/\/$/, "")
  const referralLink = expert.referral_code ? `https://${appDomain}/r/${expert.referral_code}` : null

  useEffect(() => {
    if (!expert.stripe_coupon_id) return
    fetch("/api/painel/promoter-code")
      .then(r => r.json())
      .then(d => setPromoCode(d.code ?? null))
      .catch(() => null)
  }, [expert.stripe_coupon_id])

  function formatBRL(cents: number) {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  const pending = referrals.filter(r => r.status === "pending").reduce((s, r) => s + r.commission_cents, 0)
  const cleared = referrals.filter(r => r.status === "cleared").reduce((s, r) => s + r.commission_cents, 0)
  const paid = referrals.filter(r => r.status === "paid").reduce((s, r) => s + r.commission_cents, 0)

  const statusLabel: Record<string, string> = {
    pending: "Pendente",
    cleared: "A pagar",
    paid: "Pago",
  }

  const statusClass: Record<string, string> = {
    pending: "text-muted-foreground",
    cleared: "text-amber-600",
    paid: "text-green-600",
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Link de referral */}
      {referralLink && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Seu link de indicação</p>
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
            <p className="text-xs truncate flex-1 font-mono">{referralLink}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(referralLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000) }}
              className="text-xs text-primary font-medium hover:opacity-70 shrink-0 flex items-center gap-1"
            >
              {copiedLink ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
            </button>
          </div>
        </div>
      )}

      {/* Cupom de desconto */}
      {promoCode && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Cupom de desconto</p>
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
            <p className="text-sm font-bold flex-1 font-mono">{promoCode}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(promoCode); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000) }}
              className="text-xs text-primary font-medium hover:opacity-70 shrink-0 flex items-center gap-1"
            >
              {copiedCode ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
            </button>
          </div>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-border bg-card px-3 py-3">
          <p className="text-[10px] text-muted-foreground mb-1">Pendente</p>
          <p className="text-sm font-bold">{formatBRL(pending)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-3 py-3">
          <p className="text-[10px] text-muted-foreground mb-1">A receber</p>
          <p className="text-sm font-bold text-amber-600">{formatBRL(cleared)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-3 py-3">
          <p className="text-[10px] text-muted-foreground mb-1">Recebido</p>
          <p className="text-sm font-bold text-green-600">{formatBRL(paid)}</p>
        </div>
      </div>

      {/* Tabela de referrals */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Histórico</p>
        {referrals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma indicação ainda.</p>
        ) : (
          referrals.map(r => (
            <div key={r.id} className="px-4 py-3 rounded-xl border border-border bg-card flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </p>
                <span className={`text-xs font-medium ${statusClass[r.status] ?? ""}`}>
                  {statusLabel[r.status] ?? r.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{r.attribution.replace(/_/g, " ")}</p>
                <p className="text-sm font-semibold">{formatBRL(r.commission_cents)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatBRL(r.amount_gross_cents)} × {r.commission_pct}%
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, required }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="px-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PainelClient({ expert: initialExpert, initialClients, initialReferrals }: Props) {
  const router = useRouter()
  const [expert, setExpert] = useState(initialExpert)
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [referrals] = useState<Referral[]>(initialReferrals)

  const TABS = expert.is_promoter
    ? (["Início", "Exibição", "Config. de IA", "Comissões"] as const)
    : (["Início", "Exibição", "Config. de IA"] as const)
  type Tab = typeof TABS[number]

  const [tab, setTab] = useState<Tab>("Início")

  async function handleInvite(email: string) {
    const res = await fetch("/api/painel/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    const data = await res.json() as { invite_url?: string; error?: string }
    if (!data.error) {
      setClients(prev => [{
        id: crypto.randomUUID(),
        user_id: null,
        expert_id: expert.id,
        email,
        active: true,
        magic_link_token: "pending",
        invited_at: new Date().toISOString(),
        activated_at: null,
      }, ...prev])
    }
    return data
  }

  async function handleToggleActive(id: string, active: boolean) {
    await fetch(`/api/painel/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    })
    setClients(prev => prev.map(p => p.id === id ? { ...p, active } : p))
  }

  async function handleSaveProfile(data: Partial<Expert>) {
    const res = await fetch("/api/painel/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json() as { expert?: Expert }
    if (json.expert) setExpert(json.expert)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/auth")
  }

  return (
    <main className="min-h-dvh max-w-2xl mx-auto px-4 pb-12 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background pt-4 pb-3 z-10">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} /> Voltar
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sair
          </button>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{expert.name}</p>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-muted rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="mt-4 flex-1"
        >
          {tab === "Início" && (
            <TabInicio
              expert={expert}
              clients={clients}
              onInvite={handleInvite}
              onToggleActive={handleToggleActive}
            />
          )}
          {tab === "Exibição" && (
            <TabVitrine
              expert={expert}
              onSave={handleSaveProfile}
              onPhotoChange={(url) => setExpert(prev => ({ ...prev, photo_url: url }))}
            />
          )}
          {tab === "Config. de IA" && (
            <TabIA expert={expert} onSave={handleSaveProfile} />
          )}
          {tab === "Comissões" && expert.is_promoter && (
            <TabComissoes expert={expert} referrals={referrals} />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}
