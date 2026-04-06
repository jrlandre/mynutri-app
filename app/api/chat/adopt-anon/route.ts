import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface IncomingMessage {
  role: string
  content: string
  content_type?: string
  mime_type?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
    }

    const body = await request.json() as { messages?: IncomingMessage[] }
    const messages = body.messages

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Nenhuma mensagem fornecida." }, { status: 400 })
    }

    const { data: newSession, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id })
      .select("id")
      .single()

    if (sessionError || !newSession) {
      return NextResponse.json({ error: "Erro ao criar sessão." }, { status: 500 })
    }

    const sessionId = newSession.id

    const rows = messages.map((msg) => ({
      session_id: sessionId,
      role: msg.role,
      content_type: msg.content_type ?? "text",
      content: msg.content,
      mime_type: msg.mime_type ?? null,
    }))

    const { error: insertError } = await supabase
      .from("chat_messages")
      .insert(rows)

    if (insertError) {
      return NextResponse.json({ error: "Erro ao salvar mensagens." }, { status: 500 })
    }

    return NextResponse.json({ sessionId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
