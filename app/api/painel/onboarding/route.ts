import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireExpert, isResponse } from '@/lib/painel/guard'

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const guard = await requireExpert()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { expert } = guard
    const body = await request.json() as { step?: number; completed?: boolean }

    const updates: Record<string, unknown> = {}
    if (typeof body.step === 'number') {
      if (body.step < 0 || body.step > 4) {
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
      }
      updates.onboarding_step = body.step
    }
    if (body.completed === true) updates.onboarding_completed = true

    const { error } = await adminClient
      .from('experts')
      .update(updates)
      .eq('id', expert.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}
