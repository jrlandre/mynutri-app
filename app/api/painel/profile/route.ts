import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireExpert, isResponse } from '@/lib/painel/guard'

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const guard = await requireExpert()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { expert } = guard
    const body = await request.json()

    const allowed = ['name', 'specialty', 'city', 'contact_links', 'listed', 'system_prompt', 'additional_emails'] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('experts')
      .update(updates)
      .eq('id', expert.id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ expert: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}
