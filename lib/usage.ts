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

  // Não autenticado — rastrear por IP via RPC atômica
  if (!userId) {
    if (!ip) {
      return { allowed: true, tier: 'anon', count: 0, limit: ANON_DAILY_LIMIT }
    }

    const { data, error } = await adminClient.rpc('check_and_increment_usage', {
      p_user_id: null,
      p_ip: ip,
      p_date: today,
      p_limit: ANON_DAILY_LIMIT,
    })
    if (error) throw new Error(`usage check failed: ${error.message}`)
    const result = data as { allowed: boolean; count: number }
    return { allowed: result.allowed, tier: 'anon', count: result.count, limit: ANON_DAILY_LIMIT }
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

  // Usuário free — check e incremento atômico via RPC
  const { data, error } = await adminClient.rpc('check_and_increment_usage', {
    p_user_id: userId,
    p_ip: null,
    p_date: today,
    p_limit: FREE_DAILY_LIMIT,
  })
  if (error) throw new Error(`usage check failed: ${error.message}`)
  const result = data as { allowed: boolean; count: number }
  return { allowed: result.allowed, tier: 'free', count: result.count, limit: FREE_DAILY_LIMIT }
}
