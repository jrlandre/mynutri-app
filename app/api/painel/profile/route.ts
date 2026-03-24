import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireExpert, isResponse } from '@/lib/painel/guard'

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const guard = await requireExpert()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { expert } = guard
    const body = await request.json()

    const allowed = ['name', 'specialty', 'city', 'contact_links', 'listed', 'system_prompt'] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    if (updates.contact_links !== undefined) {
      const VALID_TYPES = ['WhatsApp', 'Instagram', 'E-mail', 'Website']
      const VALID_PROTOCOLS = ['https://', 'http://', 'mailto:', 'tel:']
      const links = updates.contact_links
      if (!Array.isArray(links) || links.length > 10) {
        return NextResponse.json({ error: 'contact_links inválido' }, { status: 400 })
      }
      for (const link of links) {
        if (typeof link !== 'object' || link === null) {
          return NextResponse.json({ error: 'Link inválido' }, { status: 400 })
        }
        if (!VALID_TYPES.includes((link as Record<string, unknown>).type as string)) {
          return NextResponse.json({ error: 'Tipo de link inválido' }, { status: 400 })
        }
        const url = (link as Record<string, unknown>).url
        if (typeof url !== 'string' || !VALID_PROTOCOLS.some(p => url.startsWith(p))) {
          return NextResponse.json({ error: 'URL de link inválida' }, { status: 400 })
        }
        if (typeof (link as Record<string, unknown>).label !== 'string') {
          return NextResponse.json({ error: 'Label de link inválido' }, { status: 400 })
        }
      }
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
