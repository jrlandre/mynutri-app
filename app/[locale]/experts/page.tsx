import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ChevronLeft } from "lucide-react"
import { Link } from '@/i18n/navigation'
import { adminClient } from "@/lib/supabase/admin"
import { ExpertFilters } from "./ExpertFilters"
import { ExpertListClient } from "./ExpertListClient"
import type { Expert } from "@/types"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Experts' })
  return {
    title: t('meta_title'),
    description: t('meta_desc'),
    alternates: { canonical: 'https://mynutri.pro/experts' },
    openGraph: {
      title: t('meta_title'),
      description: t('meta_desc'),
      url: 'https://mynutri.pro/experts',
      type: 'website',
      images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MyNutri' }],
    },
  }
}

export default async function ExpertsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ city?: string; specialty?: string }>
}) {
  const { locale } = await params
  const { city, specialty } = await searchParams
  const t = await getTranslations({ locale, namespace: 'Experts' })

  const { data: allExperts } = await adminClient
    .from("experts")
    .select("id, subdomain, name, photo_url, specialty, city, contact_links")
    .eq("active", true)
    .eq("listed", true)
    .order("name")

  const all = (allExperts ?? []) as unknown as Expert[]

  const experts = all.filter(
    (e) =>
      (!city || e.city?.toLowerCase().includes(city.toLowerCase())) &&
      (!specialty || e.specialty?.toLowerCase().includes(specialty.toLowerCase()))
  )

  const cities = [...new Set(all.map((e) => e.city).filter(Boolean))] as string[]
  const specialties = [...new Set(all.map((e) => e.specialty).filter(Boolean))] as string[]

  return (
    <main className="min-h-dvh max-w-2xl mx-auto px-4 pb-12 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background pt-4 pb-3 z-10">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} />
            {t('back')}
          </Link>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        <ExpertFilters
          cities={cities}
          specialties={specialties}
          activeCity={city ?? ""}
          activeSpecialty={specialty ?? ""}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col mt-4">
        {experts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <span className="text-3xl">🌱</span>
            <p className="text-sm font-medium">{t('empty')}</p>
            <p className="text-xs text-muted-foreground">
              {city || specialty ? t('empty_filtered') : t('empty_soon')}
            </p>
          </div>
        ) : (
          <ExpertListClient experts={experts} />
        )}
      </div>
    </main>
  )
}
