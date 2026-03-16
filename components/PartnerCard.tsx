"use client"

import type { Partner } from "@/types"

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

interface Props {
  partner: Partner
  onClick: () => void
}

export default function PartnerCard({ partner, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition-all text-left"
    >
      {partner.photo_url ? (
        <img
          src={partner.photo_url}
          alt={partner.name}
          className="w-12 h-12 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${avatarColor(partner.name)}`}>
          {initials(partner.name)}
        </div>
      )}

      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-semibold truncate">{partner.name}</span>
        {partner.specialty && (
          <span className="text-xs text-muted-foreground truncate">{partner.specialty}</span>
        )}
        {partner.city && (
          <span className="text-xs text-muted-foreground truncate">{partner.city}</span>
        )}
      </div>
    </button>
  )
}
