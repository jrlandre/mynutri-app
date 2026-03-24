import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireExpert, isResponse } from '@/lib/painel/guard'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const guard = await requireExpert()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { expert } = guard
    const { id } = await params
    const { active } = await request.json()

    if (typeof active !== 'boolean') {
      return NextResponse.json({ error: 'Status de ativação inválido' }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('clients')
      .update({ active })
      .eq('id', id)
      .eq('expert_id', expert.id)
      .select('id')

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const guard = await requireExpert()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { expert } = guard
    const { id } = await params

    // Busca o cliente primeiro para saber se é pendente
    const { data: client } = await adminClient
      .from('clients')
      .select('activated_at')
      .eq('id', id)
      .eq('expert_id', expert.id)
      .maybeSingle()

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    if (!client.activated_at) {
      // É um convite pendente: DELETA de vez do banco
      const { error } = await adminClient
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('expert_id', expert.id)
      
      if (error) throw error
    } else {
      // Já é um cliente real: apenas desativa
      const { error } = await adminClient
        .from('clients')
        .update({ active: false })
        .eq('id', id)
        .eq('expert_id', expert.id)
      
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}
