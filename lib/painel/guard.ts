import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { Nutritionist } from '@/types'

export const PATIENT_LIMIT: Record<string, number> = {
  standard: 50,
  enterprise: Infinity,
}

export interface GuardResult {
  nutritionist: Nutritionist
}

export async function requireNutritionist(): Promise<GuardResult | Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: nutritionist, error } = await adminClient
    .from('nutritionists')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (!nutritionist) {
    return Response.json({ error: 'Acesso negado' }, { status: 403 })
  }

  return { nutritionist: nutritionist as Nutritionist }
}

export function isResponse(v: GuardResult | Response): v is Response {
  return v instanceof Response
}
