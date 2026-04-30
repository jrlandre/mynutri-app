import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

const cookieDomain = (() => {
  try {
    const h = new URL(process.env.NEXT_PUBLIC_APP_URL ?? '').hostname
    return h && h !== 'localhost' ? `.${h}` : undefined
  } catch { return undefined }
})()

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}
  )
}
