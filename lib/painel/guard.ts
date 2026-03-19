import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { Expert } from '@/types'

export const PATIENT_LIMIT: Record<string, number> = {
  standard: 50,
  enterprise: Infinity,
}

export interface GuardResult {
  expert: Expert
}

export async function requireExpert(): Promise<GuardResult | Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: expert, error } = await adminClient
    .from('experts')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (!expert) {
    return Response.json({ error: 'Acesso negado' }, { status: 403 })
  }

  return { expert: expert as Expert }
}

export function isResponse(v: GuardResult | Response): v is Response {
  return v instanceof Response
}
