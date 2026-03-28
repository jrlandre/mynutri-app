import { cache } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { adminClient } from "@/lib/supabase/admin"
import type { Expert } from "@/types"

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

type ExpertProfile = Pick<Expert, "id" | "name" | "photo_url" | "specialty" | "city" | "contact_links">

// cache() deduplica a chamada entre generateMetadata e o componente da página
const getExpert = cache(async (handle: string) => {
  const { data } = await adminClient
    .from("experts")
    .select("id, name, photo_url, specialty, city, contact_links")
    .eq("subdomain", handle)
    .eq("active", true)
    .eq("listed", true)
    .maybeSingle()
  return data as unknown as ExpertProfile | null
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const expert = await getExpert(handle)

  if (!expert) return { title: 'Expert não encontrado — MyNutri' }

  const parts = [expert.specialty, expert.city].filter(Boolean).join(' · ')
  const description = parts
    ? `${parts} — Clientes deste expert têm acesso ilimitado ao MyNutri.`
    : 'Clientes deste expert têm acesso ilimitado ao MyNutri.'

  return {
    title: `${expert.name} — MyNutri`,
    description,
    alternates: {
      canonical: `https://mynutri.pro/experts/${handle}`,
    },
    openGraph: {
      title: `${expert.name} — MyNutri`,
      description,
      url: `https://mynutri.pro/experts/${handle}`,
      type: 'profile',
      images: expert.photo_url
        ? [{ url: expert.photo_url, alt: expert.name }]
        : [{ url: '/og-default.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${expert.name} — MyNutri`,
      description,
      images: expert.photo_url ? [expert.photo_url] : ['/og-default.png'],
    },
  }
}

export default async function ExpertProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const expert = await getExpert(handle)

  if (!expert) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Perfil não encontrado.</p>
      </main>
    )
  }

  const colorClass = avatarColor(expert.name)
  const inits = initials(expert.name)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: expert.name,
    ...(expert.specialty ? { jobTitle: expert.specialty } : {}),
    ...(expert.city ? { address: { '@type': 'PostalAddress', addressLocality: expert.city } } : {}),
    url: `https://mynutri.pro/experts/${handle}`,
    ...(expert.photo_url ? { image: expert.photo_url } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-dvh max-w-2xl mx-auto px-4 pb-12 flex flex-col">
        {/* Header — mesmo padrão da listagem */}
        <div className="sticky top-0 bg-background pt-4 pb-3 z-10">
          <Link
            href="/experts"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ChevronLeft size={16} />
            Encontre um Expert
          </Link>
        </div>

        {/* Perfil centralizado */}
        <div className="max-w-sm mx-auto w-full flex flex-col items-center gap-8 pt-8">
          {/* Avatar + info */}
          <div className="flex flex-col items-center gap-4 text-center">
            {expert.photo_url ? (
              <Image
                src={expert.photo_url}
                alt={expert.name}
                width={96}
                height={96}
                className="rounded-full object-cover"
              />
            ) : (
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold ${colorClass}`}>
                {inits}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-extrabold tracking-tight">{expert.name}</h1>
              {expert.specialty && (
                <p className="text-sm text-muted-foreground">{expert.specialty}</p>
              )}
              {expert.city && (
                <p className="text-xs text-muted-foreground">{expert.city}</p>
              )}
            </div>
          </div>

          {/* Value prop */}
          <div className="w-full rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Clientes deste Expert têm{" "}
              <span className="text-foreground font-medium">acesso ilimitado ao MyNutri</span>{" "}
              como parte do acompanhamento.
            </p>
          </div>

          {/* Contact links */}
          {expert.contact_links?.length > 0 && (
            <div className="w-full flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                Contato
              </p>
              {expert.contact_links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted active:scale-[0.98] transition-all"
                >
                  {link.label}
                  <span className="text-muted-foreground text-xs shrink-0">↗</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
