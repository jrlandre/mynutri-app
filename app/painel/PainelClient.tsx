"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X, Trash2, Check, Upload, Link2, ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Nutritionist, Patient, ContactLink } from "@/types"

const PLAN_LIMIT: Record<string, number> = { standard: 50, enterprise: Infinity }
const CONTACT_TYPES = ["whatsapp", "instagram", "email", "website"] as const

interface Props {
  nutritionist: Nutritionist
  initialPatients: Patient[]
}

// ─── Aba Início ──────────────────────────────────────────────────────────────

function TabInicio({ nutritionist, patients, onInvite, onDeactivate }: {
  nutritionist: Nutritionist
  patients: Patient[]
  onInvite: (email: string) => Promise<{ invite_url?: string; error?: string }>
  onDeactivate: (id: string) => Promise<void>
}) {
  const limit = PLAN_LIMIT[nutritionist.plan] ?? 50
  const active = patients.filter(p => p.active)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url?: string; error?: string } | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [deactivating, setDeactivating] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteResult(null)
    const result = await onInvite(inviteEmail)
    setInviteResult({ url: result.invite_url, error: result.error })
    if (!result.error) setInviteEmail("")
    setInviteLoading(false)
  }

  async function handleDeactivate(id: string) {
    setDeactivating(id)
    await onDeactivate(id)
    setDeactivating(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Card de vagas */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Pacientes ativos</p>
          <p className="text-2xl font-bold tracking-tight mt-0.5">
            {active.length}
            <span className="text-base font-normal text-muted-foreground">
              {" "}/ {isFinite(limit) ? limit : "∞"}
            </span>
          </p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setInviteResult(null) }}
          disabled={isFinite(limit) && active.length >= limit}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Gerar convite
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
                placeholder="email@paciente.com"
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
                  onClick={() => navigator.clipboard.writeText(inviteResult.url!)}
                  className="text-xs text-primary font-medium hover:opacity-70 shrink-0"
                >
                  Copiar
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de pacientes */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Pacientes</p>
        {patients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum paciente ainda. Gere o primeiro convite!</p>
        ) : (
          patients.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0 text-muted-foreground">
                {(p.email ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.email ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {p.activated_at ? "Ativo" : "Convite pendente"}
                </p>
              </div>
              {p.active && (
                <button
                  onClick={() => handleDeactivate(p.id)}
                  disabled={deactivating === p.id}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Aba Vitrine ──────────────────────────────────────────────────────────────

function TabVitrine({ nutritionist, onSave }: {
  nutritionist: Nutritionist
  onSave: (data: Partial<Nutritionist>) => Promise<void>
}) {
  const [name, setName] = useState(nutritionist.name)
  const [specialty, setSpecialty] = useState(nutritionist.specialty ?? "")
  const [city, setCity] = useState(nutritionist.city ?? "")
  const [listed, setListed] = useState(nutritionist.listed)
  const [links, setLinks] = useState<ContactLink[]>(nutritionist.contact_links ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Photo
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(nutritionist.photo_url)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)
    setUploadingPhoto(true)
    const preview = URL.createObjectURL(file)
    setPhotoPreview(preview)
    const formData = new FormData()
    formData.append("photo", file)
    const res = await fetch("/api/painel/photo", { method: "POST", body: formData })
    const data = await res.json() as { photo_url?: string; error?: string }
    if (data.error) { setPhotoError(data.error); setPhotoPreview(nutritionist.photo_url) }
    setUploadingPhoto(false)
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
    await onSave({ name, specialty: specialty || null, city: city || null, listed, contact_links: links })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
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
            <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP · Máx. 2 MB</p>
            {photoError && <p className="text-xs text-destructive">{photoError}</p>}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
      </div>

      {/* Campos */}
      <Field label="Nome" value={name} onChange={setName} required />
      <Field label="Especialidade" value={specialty} onChange={setSpecialty} placeholder="Ex: Nutrição esportiva" />
      <Field label="Cidade" value={city} onChange={setCity} placeholder="Ex: São Paulo – SP" />

      {/* Vitrine toggle */}
      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-sm font-medium">Aparecer na vitrine</p>
          <p className="text-xs text-muted-foreground">Exibir perfil na página /nutris para novos clientes</p>
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
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Links de contato</p>
          <button type="button" onClick={addLink} className="text-xs text-primary font-medium hover:opacity-70">
            + Adicionar
          </button>
        </div>
        {links.map((link, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex flex-col gap-1.5 flex-1">
              <select
                value={link.type}
                onChange={e => updateLink(i, "type", e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                value={link.label}
                onChange={e => updateLink(i, "label", e.target.value)}
                placeholder="Rótulo (ex: WhatsApp)"
                className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <input
                value={link.url}
                onChange={e => updateLink(i, "url", e.target.value)}
                placeholder="URL"
                className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <button type="button" onClick={() => removeLink(i)} className="p-2 text-muted-foreground hover:text-destructive transition-colors mt-1">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saved ? <><Check size={16} /> Salvo</> : saving ? "Salvando..." : "Salvar vitrine"}
      </button>
    </form>
  )
}

// ─── Aba IA ───────────────────────────────────────────────────────────────────

function TabIA({ nutritionist, onSave }: {
  nutritionist: Nutritionist
  onSave: (data: Partial<Nutritionist>) => Promise<void>
}) {
  const [prompt, setPrompt] = useState(nutritionist.system_prompt ?? "")
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

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold">Prompt personalizado</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Este texto é enviado à IA antes de cada análise dos seus pacientes. Use para definir tom, foco nutricional, restrições ou orientações específicas da sua abordagem.
        </p>
      </div>
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Ex: Você é uma assistente de nutrição especializada em nutrição funcional. Priorize sempre alimentos in natura e minimamente processados…"
        rows={10}
        className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none leading-relaxed"
      />
      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saved ? <><Check size={16} /> Salvo</> : saving ? "Salvando..." : "Salvar prompt"}
      </button>
    </form>
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

const TABS = ["Início", "Vitrine", "IA"] as const
type Tab = typeof TABS[number]

export default function PainelClient({ nutritionist: initialNutritionist, initialPatients }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("Início")
  const [nutritionist, setNutritionist] = useState(initialNutritionist)
  const [patients, setPatients] = useState<Patient[]>(initialPatients)

  async function handleInvite(email: string) {
    const res = await fetch("/api/painel/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    const data = await res.json() as { invite_url?: string; error?: string }
    if (!data.error) {
      // Adiciona paciente pendente à lista localmente
      setPatients(prev => [{
        id: crypto.randomUUID(),
        user_id: null,
        nutritionist_id: nutritionist.id,
        email,
        active: true,
        magic_link_token: "pending",
        invited_at: new Date().toISOString(),
        activated_at: null,
      }, ...prev])
    }
    return data
  }

  async function handleDeactivate(id: string) {
    await fetch(`/api/painel/patients/${id}`, { method: "DELETE" })
    setPatients(prev => prev.map(p => p.id === id ? { ...p, active: false } : p))
  }

  async function handleSaveProfile(data: Partial<Nutritionist>) {
    const res = await fetch("/api/painel/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json() as { nutritionist?: Nutritionist }
    if (json.nutritionist) setNutritionist(json.nutritionist)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth")
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
        <p className="text-sm text-muted-foreground mt-0.5">{nutritionist.name}</p>

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
              nutritionist={nutritionist}
              patients={patients}
              onInvite={handleInvite}
              onDeactivate={handleDeactivate}
            />
          )}
          {tab === "Vitrine" && (
            <TabVitrine nutritionist={nutritionist} onSave={handleSaveProfile} />
          )}
          {tab === "IA" && (
            <TabIA nutritionist={nutritionist} onSave={handleSaveProfile} />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}
