"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import ExpertCard from "@/components/ExpertCard"
import type { Expert } from "@/types"

export default function ExpertsPage() {
  const router = useRouter()
  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)

  const [cityFilter, setCityFilter] = useState("")
  const [specialtyFilter, setSpecialtyFilter] = useState("")

  const fetchExperts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (cityFilter) params.set("city", cityFilter)
    if (specialtyFilter) params.set("specialty", specialtyFilter)

    try {
      const res = await fetch(`/api/experts?${params}`)
      const data = await res.json()
      setExperts(data.experts ?? [])
    } catch {
      setExperts([])
    } finally {
      setLoading(false)
    }
  }, [cityFilter, specialtyFilter])

  useEffect(() => {
    fetchExperts()
  }, [fetchExperts])

  // Unique cities and specialties for filter pills
  const cities = [...new Set(experts.map(p => p.city).filter(Boolean))] as string[]
  const specialties = [...new Set(experts.map(p => p.specialty).filter(Boolean))] as string[]

  return (
    <main className="min-h-dvh max-w-2xl mx-auto px-4 pb-12 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background pt-4 pb-3 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} />
            Voltar
          </button>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">Experts parceiros</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Clientes desses profissionais têm acesso ilimitado ao MyNutri.
        </p>

        {/* Filtros */}
        {(cities.length > 0 || specialties.length > 0) && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
            {specialties.map(s => (
              <button
                key={s}
                onClick={() => setSpecialtyFilter(specialtyFilter === s ? "" : s)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  specialtyFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
            {cities.map(c => (
              <button
                key={c}
                onClick={() => setCityFilter(cityFilter === c ? "" : c)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  cityFilter === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col mt-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : experts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-3 text-center"
          >
            <span className="text-3xl">🌱</span>
            <p className="text-sm font-medium">Nenhum Expert encontrado</p>
            <p className="text-xs text-muted-foreground">
              {cityFilter || specialtyFilter
                ? "Tente remover os filtros."
                : "Em breve mais profissionais por aqui."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {experts.map(expert => (
              <ExpertCard
                key={expert.id}
                expert={expert}
                onClick={() => router.push(`/experts/${expert.subdomain}`)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </main>
  )
}
