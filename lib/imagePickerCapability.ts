const CACHE_KEY = 'mynutri_picker_cap'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export type Capability = 'native' | 'custom'

export function readCapabilityCache(): Capability | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const { value, expires } = JSON.parse(raw) as { value: Capability; expires: number }
      if (Date.now() < expires) return value
    }
  } catch { /* ignore */ }
  return null
}

export function saveCapabilityCache(cap: Capability): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ value: cap, expires: Date.now() + CACHE_TTL_MS }))
  } catch { /* ignore */ }
}
