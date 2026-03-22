import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

type Provider = 'email' | 'google' | 'apple' | 'azure'

interface CheckEmailResponse {
  exists: boolean
  provider?: Provider
  confirmed?: boolean
  hasPassword?: boolean
}

async function findUserByEmail(email: string) {
  let page = 1
  while (true) {
    const { data: { users }, error } = await adminClient.auth.admin.listUsers({ page, perPage: 50 })
    if (error || !users || users.length === 0) return null
    const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (users.length < 50) return null
    page++
  }
}

export async function POST(request: NextRequest) {
  // Delay para prevenir timing attacks (enumeração de e-mails)
  const delay = Math.floor(Math.random() * 500) + 200

  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      await new Promise(r => setTimeout(r, delay))
      return NextResponse.json({ error: 'email_required' }, { status: 400 })
    }

    // Buscar usuário pelo e-mail
    let result: CheckEmailResponse = { exists: false }

    const user = await findUserByEmail(email)
    if (user) {
      const providers = (user.app_metadata?.providers ?? []) as string[]
      let provider: Provider = 'email'
      if (providers.includes('google')) provider = 'google'
      else if (providers.includes('apple')) provider = 'apple'
      else if (providers.includes('azure')) provider = 'azure'

      let hasPassword: boolean | undefined
      if (provider === 'email') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (adminClient as any).rpc('check_user_has_password', { p_email: email })
        hasPassword = data === true
      }

      result = {
        exists: true,
        provider,
        confirmed: !!user.email_confirmed_at,
        hasPassword,
      }
    }

    await new Promise(r => setTimeout(r, delay))
    return NextResponse.json(result)
  } catch {
    await new Promise(r => setTimeout(r, delay))
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
