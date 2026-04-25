"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { LocaleSwitcher } from "@/components/LocaleSwitcher"
import posthog from 'posthog-js'
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X, Trash2, Check, Upload, Link2, ChevronLeft, Copy, Pause, Play, AlertTriangle, Sparkles } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { compressImage } from "@/lib/compress-image"
import type { Expert, Client, ContactLink, Referral } from "@/types"
import { CLIENT_LIMIT as PLAN_LIMIT } from "@/lib/plans"
import { CitySelector } from "@/components/CitySelector"
import OnboardingWizard from "./OnboardingWizard"
import GeneratePromptModal from "@/components/GeneratePromptModal"

const CONTACT_TYPES = ["WhatsApp", "Instagram", "E-mail", "Website"] as const

type TabKey = 'inicio' | 'exibicao' | 'ia' | 'comissoes'

interface Props {
  expert: Expert
  initialClients: Client[]
  initialReferrals: Referral[]
}

// ─── Profile Checklist ───────────────────────────────────────────────────────

function ProfileChecklist({ expert, onNavigate }: {
  expert: Expert
  onNavigate: (tab: TabKey) => void
}) {
  const t = useTranslations('Painel')

  const items = [
    { key: 'photo',      done: !!expert.photo_url,               label: t('checklist_photo'),      tab: 'exibicao' as TabKey },
    { key: 'name',       done: !!expert.name?.trim(),             label: t('checklist_name'),       tab: 'exibicao' as TabKey },
    { key: 'specialty',  done: !!expert.specialty,               label: t('checklist_specialty'),  tab: 'exibicao' as TabKey },
    { key: 'visibility', done: expert.listed,                    label: t('checklist_visibility'), tab: 'exibicao' as TabKey },
    { key: 'contact',    done: (expert.contact_links?.length ?? 0) > 0, label: t('checklist_contact'), tab: 'exibicao' as TabKey },
  ]

  const doneCount = items.filter(i => i.done).length
  const pct = Math.round((doneCount / items.length) * 100)

  if (pct === 100) return null

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4 flex flex-col gap-3">
      <p className="text-sm font-semibold">{t('profile_checklist_title', { pct })}</p>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => !item.done && onNavigate(item.tab)}
            className={`flex items-center gap-2.5 text-sm text-left ${item.done ? 'opacity-50 cursor-default' : 'hover:text-primary transition-colors'}`}
          >
            <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-xs ${item.done ? 'bg-primary/20 text-primary' : 'border border-muted-foreground/40'}`}>
              {item.done ? '✓' : ''}
            </span>
            {item.label}
            {!item.done && <span className="ml-auto text-muted-foreground text-xs">→</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Aba Início ──────────────────────────────────────────────────────────────

function TabInicio({ expert, clients, onInvite, onToggleActive, onDelete, onNavigate }: {
  expert: Expert
  clients: Client[]
  onInvite: (email: string) => Promise<{ invite_url?: string; error?: string; email_sent?: boolean }>
  onToggleActive: (id: string, active: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onNavigate: (tab: TabKey) => void
}) {
  const t = useTranslations('Painel')
  const limit = PLAN_LIMIT[expert.plan] ?? 50

  const pendingInvites = clients.filter(p => p.active && !p.activated_at)
  const activeClients = clients.filter(p => p.active && p.activated_at)
  const inactiveClients = clients.filter(p => !p.active)

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url?: string; error?: string; email_sent?: boolean } | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [copiedInvite, setCopiedInvite] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteResult(null)
    const result = await onInvite(inviteEmail)
    setInviteResult({ url: result.invite_url, error: result.error, email_sent: result.email_sent })
    if (!result.error) setInviteEmail("")
    setInviteLoading(false)
  }

  async function handleToggle(id: string, currentStatus: boolean) {
    setToggling(id)
    await onToggleActive(id, !currentStatus)
    setToggling(null)
  }

  async function handleDelete(id: string) {
    if (!confirm(t('invite_delete_confirm'))) return
    setDeleting(id)
    await onDelete(id)
    setDeleting(null)
  }

  // Trial banner
  const trialBanner = (() => {
    if (!expert.trial_end) return null
    const msLeft = new Date(expert.trial_end).getTime() - Date.now()
    if (msLeft <= 0) return null
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
    const isUrgent = daysLeft <= 3
    return { daysLeft, isUrgent }
  })()

  return (
    <div className="flex flex-col gap-6">
      {/* Banner de trial */}
      {trialBanner && (
        <div className={`rounded-2xl px-4 py-3 flex items-center justify-between gap-3 ${trialBanner.isUrgent ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
          <p className={`text-sm font-medium ${trialBanner.isUrgent ? 'text-amber-800' : 'text-emerald-800'}`}>
            {trialBanner.daysLeft === 1
              ? t('trial_banner_tomorrow')
              : t('trial_banner', { days: trialBanner.daysLeft })}
          </p>
          <a
            href="/assinar"
            className={`text-xs font-semibold shrink-0 ${trialBanner.isUrgent ? 'text-amber-700 hover:text-amber-900' : 'text-emerald-700 hover:text-emerald-900'}`}
          >
            {t('trial_banner_subscribe')} →
          </a>
        </div>
      )}

      {/* Profile checklist */}
      <ProfileChecklist expert={expert} onNavigate={onNavigate} />

      {/* Card de vagas */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t('clients_active')}</p>
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
          <Plus size={16} /> {t('invite_btn')}
        </button>
      </div>

      {/* Gerenciar assinatura */}
      <div className="flex justify-end -mt-4">
        <button
          onClick={async () => {
            try {
              const res = await fetch('/api/painel/billing', { method: 'POST' })
              if (!res.ok) return
              const { url } = await res.json() as { url?: string }
              if (url) window.location.href = url
            } catch { /* silently fail — user can retry */ }
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="underline underline-offset-2">{t('manage_subscription')}</span> ↗
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
              <p className="text-sm font-semibold">{t('invite_modal_title')}</p>
              <button onClick={() => { setShowInvite(false); setInviteResult(null) }} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="flex gap-2 w-full">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder={t('invite_email_placeholder')}
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="submit"
                disabled={inviteLoading}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {inviteLoading ? t('invite_generating') : t('invite_generate')}
              </button>
            </form>
            {inviteResult?.error && (
              <p className="text-xs text-destructive">{inviteResult.error}</p>
            )}
            {inviteResult?.email_sent === false && (
              <p className="text-xs text-amber-600">{t('invite_email_warn')}</p>
            )}
            {inviteResult?.url && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
                  <Link2 size={14} className="text-muted-foreground shrink-0" />
                  <p className="text-xs truncate flex-1 font-mono">{inviteResult.url}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteResult.url!); setCopiedInvite(true); setTimeout(() => setCopiedInvite(false), 2000) }}
                    className="text-xs text-primary font-medium hover:opacity-70 shrink-0 flex items-center gap-1"
                  >
                    {copiedInvite ? <><Check size={12} /> {t('invite_copied')}</> : <><Copy size={12} /> {t('invite_copy')}</>}
                  </button>
                </div>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(t('invite_whatsapp_msg', { name: expert.name, url: inviteResult.url, appName: expert.app_name || "MyNutri" }))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 active:scale-[0.97] transition-all"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {t('invite_whatsapp_btn')}
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listas de clientes */}
      <div className="flex flex-col gap-8">
        {/* Pendentes */}
        {pendingInvites.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2 px-1">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">{t('pending_invites')}</p>
              <span className="text-xs font-medium text-muted-foreground/50">{pendingInvites.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {pendingInvites.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0 text-muted-foreground">
                    {(p.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.email ?? "—"}</p>
                    <p className="text-xs text-muted-foreground italic">{t('invite_status_pending')}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deleting === p.id}
                    title={t('invite_delete_confirm')}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ativos */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2 px-1">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">{t('clients_active_section')}</p>
            <span className="text-xs font-medium text-muted-foreground/50">{activeClients.length}</span>
          </div>
          {activeClients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center border-2 border-dashed border-border rounded-2xl">
              {t('clients_empty')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {activeClients.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0 text-primary">
                    {(p.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.email ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{t('client_status_active')}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(p.id, true)}
                    disabled={toggling === p.id}
                    title={t('pause_access')}
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
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">{t('clients_paused_section')}</p>
              <span className="text-xs font-medium text-muted-foreground/50">{inactiveClients.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {inactiveClients.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card opacity-60">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0 text-muted-foreground">
                    {(p.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.email ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{t('client_status_paused')}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(p.id, false)}
                    disabled={toggling === p.id}
                    title={t('resume_access')}
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

// ─── Helpers de URL para links de contato ────────────────────────────────────

/** Converte atalhos digitados pelo usuário para URLs válidas antes de salvar */
function normalizeContactUrl(type: string, raw: string): string {
  const v = raw.trim()
  if (!v) return v
  switch (type) {
    case "WhatsApp": {
      if (v.startsWith("https://wa.me/") || v.startsWith("http://wa.me/")) return v
      const digits = v.replace(/\D/g, "")
      if (!digits) return v
      const num = digits.startsWith("55") ? digits : `55${digits}`
      return `https://wa.me/${num}`
    }
    case "Instagram": {
      if (v.startsWith("https://") || v.startsWith("http://")) return v
      if (v.startsWith("@")) return `https://instagram.com/${v.slice(1)}`
      if (v.startsWith("instagram.com/") || v.startsWith("www.instagram.com/")) return `https://${v}`
      return v
    }
    case "E-mail": {
      if (v.startsWith("mailto:")) return v
      if (v.includes("@") && !v.includes(" ")) return `mailto:${v}`
      return v
    }
    case "Website": {
      if (v.startsWith("https://") || v.startsWith("http://")) return v
      if (v.includes(".") && !v.includes(" ")) return `https://${v}`
      return v
    }
    default:
      return v
  }
}

/** Returns a Painel i18n key when the URL format is unrecognizable, or null if valid */
function getUrlHintKey(type: string, url: string): string | null {
  if (!url) return null
  if (type === "WhatsApp" && /^[+\d\s\-().]+$/.test(url)) return null
  if (type === "WhatsApp" && (url.startsWith("https://wa.me/") || url.startsWith("http://wa.me/"))) return null
  if (type === "Instagram" && (url.startsWith("@") || url.startsWith("instagram.com/") || url.startsWith("www.instagram.com/") || url.startsWith("https://") || url.startsWith("http://"))) return null
  if (type === "E-mail" && (url.startsWith("mailto:") || (url.includes("@") && !url.includes(" ")))) return null
  if (type === "Website" && (url.startsWith("https://") || url.startsWith("http://") || (url.includes(".") && !url.includes(" ")))) return null
  if (["https://", "http://", "mailto:", "tel:"].some(p => url.startsWith(p))) return null
  if (type === "WhatsApp")  return "contact_format_whatsapp"
  if (type === "Instagram") return "contact_format_instagram"
  if (type === "E-mail")    return "contact_format_email"
  if (type === "Website")   return "contact_format_website"
  return "contact_format_invalid"
}

// ─── Aba Vitrine ──────────────────────────────────────────────────────────────

function TabVitrine({ expert, onSave, onPhotoChange, onDirtyChange }: {
  expert: Expert
  onSave: (data: Partial<Expert>) => Promise<void>
  onPhotoChange: (url: string) => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  const t = useTranslations('Painel')
  const [name, setName] = useState(expert.name)
  const [specialty, setSpecialty] = useState(expert.specialty ?? "")
  const [city, setCity] = useState(expert.city ?? "")
  const [appName, setAppName] = useState(expert.app_name ?? "")
  const [appSubtitle, setAppSubtitle] = useState(expert.app_subtitle ?? "")
  const [subtitleEnabled, setSubtitleEnabled] = useState(expert.app_subtitle !== "")
  const [listed, setListed] = useState(expert.listed)
  const [links, setLinks] = useState<ContactLink[]>(expert.contact_links ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hintUrls, setHintUrls] = useState<Record<number, string>>({})
  const hintTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const linksContainerRef = useRef<HTMLDivElement>(null)

  // Autoscroll quando adicionar link
  useEffect(() => {
    if (links.length > (expert.contact_links?.length ?? 0)) {
      setTimeout(() => {
        const lastLink = linksContainerRef.current?.lastElementChild
        if (lastLink) {
          lastLink.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links.length])

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
      if (!res.ok) { setPhotoError(t('photo_error')); setPhotoPreview(expert.photo_url); return }
      const data = await res.json() as { photo_url?: string; error?: string }

      if (data.error) {
        setPhotoError(data.error)
        setPhotoPreview(expert.photo_url)
      } else if (data.photo_url) {
        setPhotoPreview(data.photo_url)
        onPhotoChange(data.photo_url)
      }
    } catch (err) {
      void err
      setPhotoError(t('photo_error'))
      setPhotoPreview(expert.photo_url)
    } finally {
      setUploadingPhoto(false)
    }
  }

  function addLink() {
    setLinks(prev => [...prev, { type: "WhatsApp", label: "", url: "" }])
  }

  function removeLink(i: number) {
    setLinks(prev => prev.filter((_, idx) => idx !== i))
    if (hintTimers.current[i]) clearTimeout(hintTimers.current[i])
    setHintUrls(prev => { const n = { ...prev }; delete n[i]; return n })
  }

  function updateLink(i: number, field: keyof ContactLink, value: string) {
    setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
    if (field === "url") {
      if (hintTimers.current[i]) clearTimeout(hintTimers.current[i])
      const currentType = links[i]?.type ?? ""
      if (!getUrlHintKey(currentType, value)) {
        setHintUrls(prev => ({ ...prev, [i]: value }))
      } else {
        hintTimers.current[i] = setTimeout(() => {
          setHintUrls(prev => ({ ...prev, [i]: value }))
        }, 900)
      }
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)

    // Ignora links sem URL, normaliza atalhos e preenche rótulo vazio
    const processedLinks = links
      .filter(link => link.url.trim())
      .map(link => ({
        ...link,
        label: link.label.trim() || link.type,
        url: normalizeContactUrl(link.type, link.url),
      }))

    try {
      await onSave({
        name,
        specialty: specialty || null,
        city: city || null,
        app_name: appName || null,
        app_subtitle: subtitleEnabled ? (appSubtitle || null) : "",
        listed,
        contact_links: processedLinks
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('save_error'))
    } finally {
      setSaving(false)
    }
  }

  const hasChanges =
    name !== expert.name ||
    specialty !== (expert.specialty ?? "") ||
    city !== (expert.city ?? "") ||
    appName !== (expert.app_name ?? "") ||
    (subtitleEnabled ? (appSubtitle || null) : "") !== expert.app_subtitle ||
    listed !== expert.listed ||
    JSON.stringify(links) !== JSON.stringify(expert.contact_links ?? [])

  useEffect(() => { onDirtyChange?.(hasChanges) }, [hasChanges]) // eslint-disable-line

  function urlTypeLabel(type: string): string {
    if (type === "WhatsApp")  return t('contact_whatsapp_hint')
    if (type === "Instagram") return t('contact_instagram_hint')
    if (type === "E-mail")    return t('contact_email_hint')
    if (type === "Website")   return t('contact_website_hint')
    return t('contact_generic_hint')
  }

  function urlPlaceholder(type: string): string {
    if (type === "WhatsApp")  return t('placeholder_whatsapp')
    if (type === "Instagram") return t('placeholder_instagram')
    if (type === "E-mail")    return t('placeholder_email')
    if (type === "Website")   return t('placeholder_website')
    return "https://..."
  }

  function labelPlaceholder(type: string): string {
    if (type === "WhatsApp")  return "WhatsApp"
    if (type === "Instagram") return "@mynutri.pro"
    if (type === "E-mail")    return "E-mail"
    if (type === "Website")   return "mynutri.pro"
    return type
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* Foto */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">{t('photo_label')}</p>
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
              {uploadingPhoto ? t('photo_uploading') : t('photo_change')}
            </button>
            {photoError && <p className="text-xs text-destructive">{photoError}</p>}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
      </div>

      {/* Campos */}
      <Field label={t('field_name')} value={name} onChange={setName} required />
      <Field label={t('field_specialty')} value={specialty} onChange={setSpecialty} placeholder={t('specialty_placeholder')} />
      <CitySelector value={city} onChange={setCity} />

      {/* Perfil toggle */}
      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-sm font-medium">{t('field_visibility')}</p>
          <p className="text-xs text-muted-foreground">{t('visibility_desc')}</p>
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
          <p className="text-sm font-semibold">{t('contact_links_title')}</p>
          <button type="button" onClick={addLink} className="text-xs text-primary font-medium hover:opacity-70 flex items-center gap-1">
            <Plus size={14} /> {t('contact_add')}
          </button>
        </div>

        {links.length === 0 ? (
          <div className="py-4 text-center border-2 border-dashed border-border rounded-2xl">
            <p className="text-xs text-muted-foreground">{t('contact_empty')}</p>
          </div>
        ) : (
          <div ref={linksContainerRef} className="flex flex-col gap-3">
            {links.map((link, i) => {
              const urlHintKey = getUrlHintKey(link.type, hintUrls[i] ?? "")
              return (
                <div key={i} className="relative p-4 rounded-2xl bg-muted/30 border border-border flex flex-col gap-3 group">
                  <button
                    type="button"
                    onClick={() => removeLink(i)}
                    className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    aria-label={t('contact_remove')}
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">{t('contact_type_label')}</label>
                      <div className="relative">
                        <select
                          value={link.type}
                          onChange={e => updateLink(i, "type", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 appearance-none pr-8"
                        >
                          {CONTACT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <ChevronLeft size={14} className="absolute right-3 top-1/2 -translate-y-1/2 -rotate-90 pointer-events-none text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">{t('contact_label_field')}</label>
                      <input
                        value={link.label}
                        onChange={e => updateLink(i, "label", e.target.value)}
                        placeholder={labelPlaceholder(link.type)}
                        className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">
                      {urlTypeLabel(link.type)}
                    </label>
                    <input
                      value={link.url}
                      onChange={e => updateLink(i, "url", e.target.value)}
                      placeholder={urlPlaceholder(link.type)}
                      className={`px-3 py-2 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 transition-colors ${
                        urlHintKey
                          ? "border-amber-400 focus:ring-amber-400/40"
                          : "border-border focus:ring-ring/40"
                      }`}
                    />
                    <AnimatePresence>
                      {urlHintKey && (
                        <motion.p
                          key="url-hint"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.18 }}
                          className="text-[11px] text-amber-600 ml-1"
                        >
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {t(urlHintKey as any)}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-muted/30 border border-border mt-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{t('app_customization_title')}</p>
          <p className="text-xs text-muted-foreground">{t('app_customization_desc')}</p>
        </div>
        <Field label={t('app_name_label')} value={appName} onChange={setAppName} placeholder="MyNutri" />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('app_subtitle_label')}</label>
            <button
              type="button"
              onClick={() => setSubtitleEnabled(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${subtitleEnabled ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${subtitleEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
          <div className={`overflow-hidden transition-[max-height,opacity] duration-200 ${subtitleEnabled ? "max-h-16 opacity-100" : "max-h-0 opacity-0"}`}>
            <input
              value={appSubtitle}
              onChange={e => setAppSubtitle(e.target.value)}
              placeholder={t('app_subtitle_placeholder')}
              className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>
      </div>

      {saveError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">{saveError}</p>
      )}
      <button
        type="submit"
        disabled={saving || !hasChanges || !name.trim()}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saved ? <><Check size={18} /> {t('saved')}</> : saving ? t('saving') : t('save_btn')}
      </button>
    </form>
  )
}

// ─── Seção Subdomínio (dentro de TabVitrine, separado do form) ────────────────

function SubdomainSection({ expert, onSubdomainChange }: {
  expert: Expert
  onSubdomainChange: (newSubdomain: string) => void
}) {
  const t = useTranslations('Painel')
  const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/
  const [newSubdomain, setNewSubdomain] = useState("")
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [showWarning, setShowWarning] = useState(false)
  const [changing, setChanging] = useState(false)
  const [changed, setChanged] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cooldownActive = (() => {
    if (!expert.last_subdomain_change_at) return false
    const elapsed = Date.now() - new Date(expert.last_subdomain_change_at).getTime()
    return elapsed < 30 * 24 * 60 * 60 * 1000
  })()

  useEffect(() => {
    if (!newSubdomain) { setStatus('idle'); return }
    if (!SUBDOMAIN_REGEX.test(newSubdomain)) { setStatus('invalid'); return }
    if (newSubdomain === expert.subdomain) { setStatus('idle'); return }
    setStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/assinar/check-subdomain?subdomain=${encodeURIComponent(newSubdomain)}`)
        const data = await res.json() as { available: boolean }
        setStatus(data.available ? 'available' : 'taken')
      } catch {
        setStatus('idle')
      }
    }, 500)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newSubdomain])

  async function handleConfirm() {
    if (status !== 'available' || changing) return
    setChanging(true)
    setError(null)
    try {
      const res = await fetch('/api/painel/subdomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: newSubdomain }),
      })
      const data = await res.json() as { subdomain?: string; panel_url?: string; error?: string }
      if (!res.ok || !data.subdomain) {
        setError(data.error ?? 'Erro ao alterar subdomínio.')
        return
      }
      setChanged(true)
      onSubdomainChange(data.subdomain)
      if (data.panel_url) {
        setTimeout(() => { window.location.href = data.panel_url! }, 2000)
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setChanging(false)
    }
  }

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? 'mynutri.pro').replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <div className="flex flex-col gap-3 pt-2 border-t border-border mt-2">
      <p className="text-sm font-semibold">{t('subdomain_section_title')}</p>
      <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase mr-1">{t('subdomain_current')}</p>
        <p className="text-xs font-mono truncate flex-1">{expert.subdomain}.{appDomain}</p>
      </div>
      {cooldownActive ? (
        <p className="text-xs text-muted-foreground">{t('subdomain_cooldown')}</p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t('subdomain_new_label')}</label>
            <div className="flex items-center border border-border rounded-xl bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring/40">
              <input
                type="text"
                value={newSubdomain}
                onChange={e => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder={t('subdomain_new_placeholder')}
                maxLength={30}
                className="flex-1 px-4 py-2.5 text-sm bg-transparent focus:outline-none min-w-0"
                autoComplete="off"
              />
              <span className="px-3 py-2.5 text-xs text-muted-foreground bg-muted border-l border-border flex-shrink-0 select-none">
                .{appDomain}
              </span>
            </div>
            <div className="h-4">
              {status === 'checking' && <span className="text-xs text-muted-foreground">{t('subdomain_checking')}</span>}
              {status === 'available' && <span className="text-xs text-emerald-600 font-medium">{t('subdomain_available')}</span>}
              {status === 'taken' && <span className="text-xs text-destructive">{t('subdomain_taken')}</span>}
              {status === 'invalid' && <span className="text-xs text-destructive">{t('subdomain_invalid')}</span>}
            </div>
          </div>
          {status === 'available' && !showWarning && (
            <button
              type="button"
              onClick={() => setShowWarning(true)}
              className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 hover:bg-amber-100 transition-colors"
            >
              <AlertTriangle size={14} /> {t('subdomain_confirm')}
            </button>
          )}
          {showWarning && !changed && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3">
              <p className="text-xs text-amber-800 leading-relaxed">{t('subdomain_warning')}</p>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={changing}
                className="w-full py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {changing ? t('subdomain_changing') : t('subdomain_confirm')}
              </button>
            </div>
          )}
          {changed && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">{t('subdomain_changed')}</p>
          )}
        </>
      )}
    </div>
  )
}

// ─── Aba IA ───────────────────────────────────────────────────────────────────

function TabIA({ expert, locale, onSave, onDirtyChange }: {
  expert: Expert
  locale: string
  onSave: (data: Partial<Expert>) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
}) {
  const t = useTranslations('Painel')
  const [prompt, setPrompt] = useState(expert.system_prompt ?? "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showModal, setShowModal] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ system_prompt: prompt || null })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasChanges = prompt !== (expert.system_prompt ?? "")

  useEffect(() => { onDirtyChange?.(hasChanges) }, [hasChanges]) // eslint-disable-line

  return (
    <>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t('ai_prompt_label')}</p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-xs text-primary font-medium hover:opacity-70 transition-opacity"
            >
              <Sparkles size={13} /> {t('gp_btn_open')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('ai_prompt_desc')}
          </p>
        </div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={t('ai_prompt_placeholder')}
          rows={10}
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none leading-relaxed"
        />
        <button
          type="submit"
          disabled={saving || !hasChanges}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saved ? <><Check size={18} /> {t('saved')}</> : saving ? t('saving') : t('save_btn')}
        </button>
      </form>

      <AnimatePresence>
        {showModal && (
          <GeneratePromptModal
            expertId={expert.id}
            locale={locale}
            onApply={(generated) => {
              setPrompt(generated)
              setShowModal(false)
            }}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Aba Comissões ────────────────────────────────────────────────────────────

function TabComissoes({ expert, referrals }: {
  expert: Expert
  referrals: Referral[]
}) {
  const t = useTranslations('Painel')
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
  const paid    = referrals.filter(r => r.status === "paid").reduce((s, r) => s + r.commission_cents, 0)

  const statusLabel: Record<string, string> = {
    pending: t('commission_pending'),
    cleared: t('commission_clearing'),
    paid:    t('commission_paid'),
  }

  const statusClass: Record<string, string> = {
    pending: "text-muted-foreground",
    cleared: "text-amber-600",
    paid:    "text-green-600",
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Link de referral */}
      {referralLink && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{t('referral_link_title')}</p>
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
            <p className="text-xs truncate flex-1 font-mono">{referralLink}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(referralLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000) }}
              className="text-xs text-primary font-medium hover:opacity-70 shrink-0 flex items-center gap-1"
            >
              {copiedLink ? <><Check size={12} /> {t('invite_copied')}</> : <><Copy size={12} /> {t('invite_copy')}</>}
            </button>
          </div>
        </div>
      )}

      {/* Cupom de desconto */}
      {promoCode && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{t('coupon_title')}</p>
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
            <p className="text-sm font-bold flex-1 font-mono">{promoCode}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(promoCode); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000) }}
              className="text-xs text-primary font-medium hover:opacity-70 shrink-0 flex items-center gap-1"
            >
              {copiedCode ? <><Check size={12} /> {t('invite_copied')}</> : <><Copy size={12} /> {t('invite_copy')}</>}
            </button>
          </div>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-border bg-card px-3 py-3">
          <p className="text-[10px] text-muted-foreground mb-1">{t('commission_pending')}</p>
          <p className="text-sm font-bold">{formatBRL(pending)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-3 py-3">
          <p className="text-[10px] text-muted-foreground mb-1">{t('commission_clearing')}</p>
          <p className="text-sm font-bold text-amber-600">{formatBRL(cleared)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-3 py-3">
          <p className="text-[10px] text-muted-foreground mb-1">{t('commission_paid')}</p>
          <p className="text-sm font-bold text-green-600">{formatBRL(paid)}</p>
        </div>
      </div>

      {/* Tabela de referrals */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">{t('referrals_history')}</p>
        {referrals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t('referrals_empty')}</p>
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
  const t = useTranslations('Painel')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expert, setExpert] = useState(initialExpert)
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [referrals] = useState<Referral[]>(initialReferrals)

  const tabKeys: TabKey[] = expert.is_promoter
    ? ['inicio', 'exibicao', 'ia', 'comissoes']
    : ['inicio', 'exibicao', 'ia']

  const initialTab: TabKey = searchParams.get("tab") === "exibicao" ? "exibicao" : "inicio"
  const [tab, setTab] = useState<TabKey>(initialTab)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  function switchTab(key: TabKey) {
    if (isDirty && key !== tab && !confirm(t('unsaved_confirm'))) return
    setTab(key)
    setIsDirty(false)
  }

  // PostHog — expert acessou painel sem clientes (onboarding)
  useEffect(() => {
    if (initialClients.length === 0) {
      posthog.capture('expert_accessed_panel', { expert_id: expert.id })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleInvite(email: string) {
    const res = await fetch("/api/painel/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    const data = await res.json() as { invite_url?: string; error?: string; email_sent?: boolean }
    if (!data.error) {
      if (clients.length === 0) {
        posthog.capture('expert_sent_first_invite', { expert_id: expert.id })
      }
      setClients(prev => [{
        id: crypto.randomUUID(),
        user_id: null,
        expert_id: expert.id,
        email: email || null,
        active: true,
        magic_link_token: "pending",
        invited_at: new Date().toISOString(),
        activated_at: null,
      }, ...prev])
    }
    return data
  }

  async function handleToggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/painel/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    })
    if (res.ok) setClients(prev => prev.map(p => p.id === id ? { ...p, active } : p))
  }

  async function handleDeleteClient(id: string) {
    const res = await fetch(`/api/painel/clients/${id}`, { method: "DELETE" })
    if (res.ok) setClients(prev => prev.filter(p => p.id !== id))
  }

  async function handleSaveProfile(data: Partial<Expert>) {
    const res = await fetch("/api/painel/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json() as { expert?: Expert; error?: string }
    if (!res.ok) {
      throw new Error(json.error ?? t('save_error'))
    }
    if (json.expert) {
      setExpert(json.expert)
      if (tab === 'exibicao') {
        posthog.capture('expert_completed_profile', { expert_id: expert.id })
      }
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/auth")
  }

  const tabLabel: Record<TabKey, string> = {
    inicio:    t('tab_inicio'),
    exibicao:  t('tab_exibicao'),
    ia:        t('tab_ia'),
    comissoes: t('tab_comissoes'),
  }

  const [onboardingDone, setOnboardingDone] = useState(expert.onboarding_completed ?? false)

  return (
    <main className="min-h-dvh max-w-2xl mx-auto px-4 pb-12 flex flex-col">
      {!onboardingDone && (
        <OnboardingWizard expert={expert} onComplete={() => setOnboardingDone(true)} />
      )}
      {/* Header */}
      <div className="sticky top-0 bg-background pt-4 pb-3 z-10">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} /> {t('back')}
          </button>
          <div className="flex items-center gap-4">
            <LocaleSwitcher />
            <button
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('logout')}
            </button>
          </div>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{expert.name}</p>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-muted rounded-xl p-1">
          {tabKeys.map(key => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabLabel[key]}
              {isDirty && key === tab && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-500 align-middle" />}
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
          {tab === "inicio" && (
            <TabInicio
              expert={expert}
              clients={clients}
              onInvite={handleInvite}
              onToggleActive={handleToggleActive}
              onDelete={handleDeleteClient}
              onNavigate={setTab}
            />
          )}
          {tab === "exibicao" && (
            <div className="flex flex-col gap-6">
              <TabVitrine
                expert={expert}
                onSave={handleSaveProfile}
                onPhotoChange={(url) => setExpert(prev => ({ ...prev, photo_url: url }))}
                onDirtyChange={setIsDirty}
              />
              <SubdomainSection
                expert={expert}
                onSubdomainChange={(sub) => setExpert(prev => ({ ...prev, subdomain: sub, last_subdomain_change_at: new Date().toISOString() }))}
              />
            </div>
          )}
          {tab === "ia" && (
            <TabIA expert={expert} locale={locale} onSave={handleSaveProfile} onDirtyChange={setIsDirty} />
          )}
          {tab === "comissoes" && expert.is_promoter && (
            <TabComissoes expert={expert} referrals={referrals} />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}
