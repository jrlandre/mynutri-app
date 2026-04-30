import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractSubdomain(host: string): string | null {
  if (process.env.NODE_ENV === 'development' && process.env.PAINEL_DEV_SUBDOMAIN) {
    return process.env.PAINEL_DEV_SUBDOMAIN
  }
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!appDomain) return null
  const match = host.match(new RegExp(`^([^.]+)\\.${appDomain.replace(/\./g, '\\.')}$`))
  const sub = match?.[1]
  if (!sub || sub === 'www') return null
  return sub
}
