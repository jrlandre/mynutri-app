"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Globe, MapPin, X, Phone, Instagram } from "lucide-react"
import type { Expert, ContactLink } from "@/types"

const AVATAR_COLORS = [
  "bg-rose-200 text-rose-800",
  "bg-violet-200 text-violet-800",
  "bg-sky-200 text-sky-800",
  "bg-emerald-200 text-emerald-800",
  "bg-amber-200 text-amber-800",
  "bg-pink-200 text-pink-800",
]

function avatarColor(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

function ContactIcon({ type, url }: { type: string, url?: string }) {
  const t = type.toLowerCase()
  if (t === "whatsapp") return <Phone size={16} />
  if (t === "instagram") return <Instagram size={16} />
  if (t === "e-mail" || t === "email") return <Mail size={16} />
  
  if (t === "website" && url) {
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      return <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" className="w-4 h-4 rounded-sm" />
    } catch {
      return <Globe size={16} />
    }
  }

  return <Globe size={16} />
}

interface Props {
  expert: Expert | null
  onClose: () => void
}

export default function ExpertSheet({ expert, onClose }: Props) {
  useEffect(() => {
    if (!expert) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [expert, onClose])

  return (
    <AnimatePresence>
      {expert && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl px-6 pt-5 pb-10 max-w-lg mx-auto shadow-xl"
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <X size={18} />
            </button>

            {/* Avatar + info */}
            <div className="flex flex-col items-center gap-3 text-center mb-6">
              {expert.photo_url ? (
                <img
                  src={expert.photo_url}
                  alt={expert.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold ${avatarColor(expert.name)}`}>
                  {initials(expert.name)}
                </div>
              )}
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold tracking-tight">{expert.name}</h2>
                {expert.specialty && (
                  <p className="text-sm text-muted-foreground">{expert.specialty}</p>
                )}
                {expert.city && (
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <MapPin size={12} /> {expert.city}
                  </p>
                )}
              </div>
            </div>

            {/* Contatos */}
            {expert.contact_links.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {expert.contact_links.map((link: ContactLink, i: number) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted active:scale-[0.98] transition-all"
                  >
                    <ContactIcon type={link.type} url={link.url} />
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
