import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

type Provider = 'email' | 'google' | 'apple' | 'azure'

interface CheckEmailResponse {
  exists: boolean
  provider?: Provider
  confirmed?: boolean
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
    const { email, flowId } = await request.json()

    if (!email || typeof email !== 'string') {
      await new Promise(r => setTimeout(r, delay))
      return NextResponse.json({ error: 'email_required' }, { status: 400 })
    }

    // Validar flow + rate limit por flow (se KV disponível)
    try {
      const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
      if (hasKV && flowId) {
        const { kv } = await import('@vercel/kv')
        const flow = await kv.get<{ ip: string; emailChecks: number }>(`auth_flow_${flowId}`)

        if (!flow) {
          await new Promise(r => setTimeout(r, delay))
          return NextResponse.json({ error: 'flow_inválido' }, { status: 400 })
        }

        if (flow.emailChecks >= 3) {
          await new Promise(r => setTimeout(r, delay))
          return NextResponse.json({ error: 'too_many_checks' }, { status: 429 })
        }

        await kv.set(`auth_flow_${flowId}`, { ...flow, emailChecks: flow.emailChecks + 1 }, { keepTtl: true })
      }
    } catch {
      // KV indisponível — continua sem validação de flow
    }

    // Buscar usuário pelo e-mail
    let result: CheckEmailResponse = { exists: false }

    const user = await findUserByEmail(email)
    if (user) {
      const identities = (user.identities ?? []) as Array<{ provider: string }>
      let provider: Provider = 'email'
      if (identities.some(i => i.provider === 'google')) provider = 'google'
      else if (identities.some(i => i.provider === 'apple')) provider = 'apple'
      else if (identities.some(i => i.provider === 'azure')) provider = 'azure'

      result = {
        exists: true,
        provider,
        confirmed: !!user.email_confirmed_at,
      }
    }

    await new Promise(r => setTimeout(r, delay))
    return NextResponse.json(result)
  } catch {
    await new Promise(r => setTimeout(r, delay))
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
