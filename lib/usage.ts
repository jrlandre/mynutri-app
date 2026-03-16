import { adminClient } from '@/lib/supabase/admin'

const FREE_DAILY_LIMIT = 3
const ANON_DAILY_LIMIT = 1

export type UsageTier = 'anon' | 'free' | 'patient'

export interface UsageCheck {
  allowed: boolean
  tier: UsageTier
  count: number
  limit: number
}

export async function checkAndIncrementUsage(
  userId: string | null
): Promise<UsageCheck> {
  // Não autenticado — controlado por rate limiting no proxy
  if (!userId) {
    return { allowed: true, tier: 'anon', count: 0, limit: ANON_DAILY_LIMIT }
  }

  // Verificar se é paciente B2B (sem limite)
  const { data: patient } = await adminClient
    .from('patients')
    .select('id')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle()

  if (patient) {
    return { allowed: true, tier: 'patient', count: 0, limit: Infinity }
  }

  // Usuário free — verificar e incrementar contagem diária
  const today = new Date().toISOString().split('T')[0]

  const { data: usage } = await adminClient
    .from('usage')
    .select('id, analysis_count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  const currentCount = usage?.analysis_count ?? 0

  if (currentCount >= FREE_DAILY_LIMIT) {
    return {
      allowed: false,
      tier: 'free',
      count: currentCount,
      limit: FREE_DAILY_LIMIT,
    }
  }

  // Incrementar
  if (usage) {
    await adminClient
      .from('usage')
      .update({ analysis_count: currentCount + 1 })
      .eq('id', usage.id)
  } else {
    await adminClient
      .from('usage')
      .insert({ user_id: userId, date: today, analysis_count: 1 })
  }

  return {
    allowed: true,
    tier: 'free',
    count: currentCount + 1,
    limit: FREE_DAILY_LIMIT,
  }
}
