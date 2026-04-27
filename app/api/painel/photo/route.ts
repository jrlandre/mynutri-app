import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireExpert, isResponse } from '@/lib/painel/guard'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const guard = await requireExpert()
    if (isResponse(guard)) return guard as unknown as NextResponse

    const { expert } = guard

    const { photo, mimeType } = await request.json()

    if (!photo) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: 'Formato inválido. Use JPEG, PNG ou WebP.' }, { status: 400 })
    }

    // ~4MB raw = ~5.4MB base64 — limite generoso considerando que o client comprime antes de enviar
    const MAX_BASE64_CHARS = 5_500_000
    if (typeof photo !== 'string' || photo.length > MAX_BASE64_CHARS) {
      return NextResponse.json({ error: 'Arquivo muito grande.' }, { status: 400 })
    }

    const ext = mimeType.split('/')[1].replace('jpeg', 'jpg')
    const path = `${expert.user_id}/avatar.${ext}`
    const buffer = Buffer.from(photo, 'base64')

    // Upload usando adminClient pois a autorização já foi feita pelo requireExpert()
    // Isso permite que usuários "sudo" (admins) façam upload nas pastas de outros experts.
    const { error: uploadError } = await adminClient.storage
      .from('avatars')
      .upload(path, buffer, { contentType: mimeType, upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data: { publicUrl } } = adminClient.storage.from('avatars').getPublicUrl(path)

    // Adiciona cache-buster para evitar imagem antiga no browser
    const photo_url = `${publicUrl}?v=${Date.now()}`

    const { error: updateError } = await adminClient
      .from('experts')
      .update({ photo_url })
      .eq('id', expert.id)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ photo_url })
  } catch (e) {
    console.error("Avatar Upload Error:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}
