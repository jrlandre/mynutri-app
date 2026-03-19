import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireExpert, isResponse } from '@/lib/painel/guard'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const guard = await requireExpert()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { expert } = guard

    const formData = await request.formData()
    const file = formData.get('photo') as File | null

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Formato inválido. Use JPEG, PNG ou WebP.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Imagem deve ter menos de 2 MB.' }, { status: 400 })
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `${expert.user_id}/avatar.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload usando o client do usuário autenticado (respeita RLS de storage)
    const supabase = await createClient()
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    // Adiciona cache-buster para evitar imagem antiga no browser
    const photo_url = `${publicUrl}?v=${Date.now()}`

    const { error: updateError } = await adminClient
      .from('experts')
      .update({ photo_url })
      .eq('id', expert.id)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ photo_url })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}
