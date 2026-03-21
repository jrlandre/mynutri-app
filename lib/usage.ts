import { adminClient } from '@/lib/supabase/admin'

const FREE_DAILY_LIMIT = 3
const ANON_DAILY_LIMIT = 1

export type UsageTier = 'anon' | 'free' | 'client' | 'expert'

export interface UsageCheck {
  allowed: boolean
  tier: UsageTier
  count: number
  limit: number
}

export async function checkAndIncrementUsage(
  userId: string | null,
  ip?: string | null
): Promise<UsageCheck> {
  const today = new Date().toISOString().split('T')[0]

  // Não autenticado — rastrear por IP
  if (!userId) {
    if (!ip) {
      return { allowed: true, tier: 'anon', count: 0, limit: ANON_DAILY_LIMIT }
    }

    const { data: usage, error } = await adminClient
      .from('usage')
      .select('id, analysis_count')
      .is('user_id', null)
      .eq('ip', ip)
      .eq('date', today)
      .maybeSingle()

    if (error) throw new Error(`usage check failed: ${error.message}`)

    const currentCount = usage?.analysis_count ?? 0

    if (currentCount >= ANON_DAILY_LIMIT) {
      return { allowed: false, tier: 'anon', count: currentCount, limit: ANON_DAILY_LIMIT }
    }

    if (usage) {
      const { error: updateErr } = await adminClient
        .from('usage')
        .update({ analysis_count: currentCount + 1 })
        .eq('id', usage.id)
      if (updateErr) throw new Error(`usage update failed: ${updateErr.message}`)
    } else {
      const { error: insertErr } = await adminClient
        .from('usage')
        .insert({ user_id: null, ip, date: today, analysis_count: 1 })
      if (insertErr) throw new Error(`usage insert failed: ${insertErr.message}`)
    }

    return { allowed: true, tier: 'anon', count: currentCount + 1, limit: ANON_DAILY_LIMIT }
  }

  // Verificar se é cliente B2B (sem limite)
  const { data: client, error: clientErr } = await adminClient
    .from('clients')
    .select('id')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle()

  if (clientErr) throw new Error(`client check failed: ${clientErr.message}`)

  if (client) {
    return { allowed: true, tier: 'client', count: 0, limit: Infinity }
  }

  // Verificar se é expert ativo ou sudo — sem limite
  const { data: expert } = await adminClient
    .from('experts')
    .select('id')
    .eq('user_id', userId)
    .or('active.eq.true,is_admin.eq.true')
    .maybeSingle()

  if (expert) {
    return { allowed: true, tier: 'expert', count: 0, limit: Infinity }
  }

  // Usuário free — verificar e incrementar contagem diária
  const { data: usage, error: usageErr } = await adminClient
    .from('usage')
    .select('id, analysis_count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  if (usageErr) throw new Error(`usage check failed: ${usageErr.message}`)

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
    const { error: updateErr } = await adminClient
      .from('usage')
      .update({ analysis_count: currentCount + 1 })
      .eq('id', usage.id)
    if (updateErr) throw new Error(`usage update failed: ${updateErr.message}`)
  } else {
    const { error: insertErr } = await adminClient
      .from('usage')
      .insert({ user_id: userId, date: today, analysis_count: 1 })
    if (insertErr) throw new Error(`usage insert failed: ${insertErr.message}`)
  }

  return {
    allowed: true,
    tier: 'free',
    count: currentCount + 1,
    limit: FREE_DAILY_LIMIT,
  }
}
