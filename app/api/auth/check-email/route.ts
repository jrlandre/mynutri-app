import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

type Provider = 'email' | 'google' | 'apple' | 'azure'

interface CheckEmailResponse {
  exists: boolean
  provider?: Provider
  confirmed?: boolean
  hasPassword?: boolean
}

export async function POST(request: NextRequest) {
  // Delay para prevenir timing attacks (enumeração de e-mails)
  const delay = Math.floor(Math.random() * 500) + 200

  // Rate limiting por IP via KV
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  try {
    const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    if (hasKV && ip !== 'unknown') {
      const { kv } = await import('@vercel/kv')
      const key = `check_email_ip_${ip}`
      const count = await kv.incr(key)
      if (count === 1) await kv.expire(key, 3600)
      if (count > 30) {
        await new Promise(r => setTimeout(r, delay))
        // Não revelar o rate limiting — retorna "não existe"
        return NextResponse.json({ exists: false } satisfies CheckEmailResponse)
      }
    }
  } catch {
    // KV indisponível — continua sem rate limiting
  }

  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      await new Promise(r => setTimeout(r, delay))
      return NextResponse.json({ error: 'email_required' }, { status: 400 })
    }

    // Busca tudo em uma única query SQL — sem O(n) listUsers
    const { data } = await adminClient.rpc('get_user_auth_data_by_email', { p_email: email.toLowerCase() })

    let result: CheckEmailResponse = { exists: false }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const d = data as { providers?: string[]; confirmed?: boolean; has_password?: boolean }
      const providers = (d.providers ?? []) as string[]
      let provider: Provider = 'email'
      if (providers.includes('google')) provider = 'google'
      else if (providers.includes('apple')) provider = 'apple'
      else if (providers.includes('azure')) provider = 'azure'

      result = {
        exists: true,
        provider,
        confirmed: d.confirmed as boolean,
        hasPassword: provider === 'email' ? (d.has_password as boolean) : undefined,
      }
    }

    await new Promise(r => setTimeout(r, delay))
    return NextResponse.json(result)
  } catch {
    await new Promise(r => setTimeout(r, delay))
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
