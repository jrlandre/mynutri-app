"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown } from "lucide-react"
import { useTranslations } from 'next-intl'

const ESTADOS_BR = [
  { uf: "AC", nome: "Acre" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "PA", nome: "Pará" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "RR", nome: "Roraima" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "TO", nome: "Tocantins" },
]

function parseCity(value: string): { city: string; uf: string } {
  const match = value.match(/^(.+)\s*-\s*([A-Z]{2})$/)
  if (match) return { city: match[1].trim(), uf: match[2] }
  return { city: value, uf: "" }
}

// In-memory cache so switching UF twice doesn't re-fetch
const citiesCache: Record<string, string[]> = {}

export function CitySelector({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const t = useTranslations('CitySelector')
  const parsed = parseCity(value)
  const [uf, setUf] = useState(parsed.uf)
  const [search, setSearch] = useState(parsed.city)
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch cities when UF changes
  useEffect(() => {
    if (!uf) { setCities([]); return }
    if (citiesCache[uf]) { setCities(citiesCache[uf]); return }
    setLoading(true)
    fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
    )
      .then(r => r.json())
      .then((data: { nome: string }[]) => {
        const names = data.map(m => m.nome)
        citiesCache[uf] = names
        setCities(names)
      })
      .catch(() => setCities([]))
      .finally(() => setLoading(false))
  }, [uf])

  function handleUFChange(newUf: string) {
    setUf(newUf)
    setSearch("")
    onChange("")
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleSelectCity(city: string) {
    setSearch(city)
    onChange(`${city} - ${uf}`)
    setOpen(false)
  }

  function handleInputBlur() {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  function handleItemMouseDown() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  const filtered = search.trim()
    ? cities.filter(c => c.toLowerCase().includes(search.toLowerCase()))
    : cities

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{t('city_label')}</label>
      <div className="flex gap-2">
        {/* Estado / UF */}
        <div className="relative shrink-0">
          <select
            value={uf}
            onChange={e => handleUFChange(e.target.value)}
            className="h-full pl-3 pr-7 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 appearance-none min-w-[72px]"
          >
            <option value="">{t('state_label')}</option>
            {ESTADOS_BR.map(e => (
              <option key={e.uf} value={e.uf}>
                {e.uf}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
          />
        </div>

        {/* Combobox de cidade */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setOpen(true)
            }}
            onFocus={() => { if (uf) setOpen(true) }}
            onBlur={handleInputBlur}
            disabled={!uf}
            placeholder={
              !uf
                ? t('state_placeholder')
                : loading
                ? t('loading')
                : t('search')
            }
            autoComplete="off"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-40 disabled:cursor-not-allowed"
          />

          {open && filtered.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
              {filtered.slice(0, 120).map(city => (
                <li key={city}>
                  <button
                    type="button"
                    onMouseDown={handleItemMouseDown}
                    onClick={() => handleSelectCity(city)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    {city}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {open && uf && !loading && cities.length > 0 && filtered.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 px-4 py-3 text-sm text-muted-foreground">
              {t('not_found')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
