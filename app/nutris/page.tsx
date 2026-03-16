"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import PartnerCard from "@/components/PartnerCard"
import PartnerSheet from "@/components/PartnerSheet"
import type { Partner } from "@/types"

export default function NutrisPage() {
  const router = useRouter()
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Partner | null>(null)

  const [cityFilter, setCityFilter] = useState("")
  const [specialtyFilter, setSpecialtyFilter] = useState("")

  const fetchPartners = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (cityFilter) params.set("city", cityFilter)
    if (specialtyFilter) params.set("specialty", specialtyFilter)

    try {
      const res = await fetch(`/api/partners?${params}`)
      const data = await res.json()
      setPartners(data.partners ?? [])
    } catch {
      setPartners([])
    } finally {
      setLoading(false)
    }
  }, [cityFilter, specialtyFilter])

  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  // Unique cities and specialties for filter pills
  const cities = [...new Set(partners.map(p => p.city).filter(Boolean))] as string[]
  const specialties = [...new Set(partners.map(p => p.specialty).filter(Boolean))] as string[]

  return (
    <>
      <main className="min-h-dvh max-w-lg mx-auto px-4 pb-12">
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
          <h1 className="text-xl font-extrabold tracking-tight">Nutricionistas parceiros</h1>
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
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : partners.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3 py-20 text-center"
            >
              <span className="text-3xl">🌱</span>
              <p className="text-sm font-medium">Nenhum parceiro encontrado</p>
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
              {partners.map(partner => (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  onClick={() => setSelected(partner)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <PartnerSheet partner={selected} onClose={() => setSelected(null)} />
    </>
  )
}
