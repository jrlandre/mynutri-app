import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireNutritionist, isResponse } from '@/lib/painel/guard'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const guard = await requireNutritionist()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { nutritionist } = guard
    const { id } = await params

    const { error } = await adminClient
      .from('patients')
      .update({ active: false })
      .eq('id', id)
      .eq('nutritionist_id', nutritionist.id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}
