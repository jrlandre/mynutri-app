import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireExpert, isResponse, PATIENT_LIMIT } from '@/lib/painel/guard'

export async function GET(): Promise<NextResponse> {
  try {
    const guard = await requireExpert()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { expert } = guard

    const { data: clients, error } = await adminClient
      .from('clients')
      .select('id, user_id, email, active, invited_at, activated_at')
      .eq('expert_id', expert.id)
      .order('invited_at', { ascending: false })

    if (error) throw new Error(error.message)

    const activeCount = (clients ?? []).filter(p => p.active).length
    const limit = PATIENT_LIMIT[expert.plan] ?? 50

    return NextResponse.json({
      expert,
      clients: clients ?? [],
      stats: { total: clients?.length ?? 0, active: activeCount, limit },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}
