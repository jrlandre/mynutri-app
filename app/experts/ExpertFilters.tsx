'use client'

import { useRouter } from 'next/navigation'

interface Props {
  cities: string[]
  specialties: string[]
  activeCity: string
  activeSpecialty: string
}

export function ExpertFilters({ cities, specialties, activeCity, activeSpecialty }: Props) {
  const router = useRouter()

  function navigate(city: string, specialty: string) {
    const params = new URLSearchParams()
    if (city) params.set('city', city)
    if (specialty) params.set('specialty', specialty)
    const qs = params.size ? `?${params}` : ''
    router.push(`/experts${qs}`)
  }

  if (cities.length === 0 && specialties.length === 0) return null

  return (
    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
      {specialties.map(s => (
        <button
          key={s}
          onClick={() => navigate(activeCity, activeSpecialty === s ? '' : s)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            activeSpecialty === s
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border bg-card hover:bg-muted'
          }`}
        >
          {s}
        </button>
      ))}
      {cities.map(c => (
        <button
          key={c}
          onClick={() => navigate(activeCity === c ? '' : c, activeSpecialty)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            activeCity === c
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border bg-card hover:bg-muted'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
