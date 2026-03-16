import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireNutritionist, isResponse, PATIENT_LIMIT } from '@/lib/painel/guard'

export async function GET(): Promise<NextResponse> {
  try {
    const guard = await requireNutritionist()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { nutritionist } = guard

    const { data: patients, error } = await adminClient
      .from('patients')
      .select('id, user_id, email, active, invited_at, activated_at')
      .eq('nutritionist_id', nutritionist.id)
      .order('invited_at', { ascending: false })

    if (error) throw new Error(error.message)

    const activeCount = (patients ?? []).filter(p => p.active).length
    const limit = PATIENT_LIMIT[nutritionist.plan] ?? 50

    return NextResponse.json({
      nutritionist,
      patients: patients ?? [],
      stats: { total: patients?.length ?? 0, active: activeCount, limit },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}
