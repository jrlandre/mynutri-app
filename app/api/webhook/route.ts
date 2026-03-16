import { NextRequest, NextResponse } from "next/server"
import { analyzeMessage } from "@/lib/gemini/analyze"
import { getHistory, setHistory } from "@/lib/session/history"
import { sendMessage } from "@/lib/whatsapp/zapi"
import type { ContentType } from "@/types"

interface ZAPIMessage {
  type: "text" | "image" | "audio"
  body?: string
  imageBase64?: string
  audioBase64?: string
  mimeType?: string
}

interface ZAPIPayload {
  phone: string
  fromMe?: boolean
  isGroup?: boolean
  message: ZAPIMessage
}

function mapToNewMessage(msg: ZAPIMessage): {
  contentType: ContentType
  content: string
  mimeType?: string
} {
  if (msg.type === "image") {
    return { contentType: "image", content: msg.imageBase64 ?? "", mimeType: msg.mimeType ?? "image/jpeg" }
  }
  if (msg.type === "audio") {
    return { contentType: "audio", content: msg.audioBase64 ?? "", mimeType: msg.mimeType ?? "audio/ogg" }
  }
  return { contentType: "text", content: msg.body ?? "" }
}

// Rate limit lazy — só instancia se KV estiver configurado
async function checkPhoneRateLimit(phone: string): Promise<boolean> {
  const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  if (!hasKV) return true // sem KV: permite (dev/preview sem Redis)

  try {
    const { Ratelimit } = await import("@upstash/ratelimit")
    const { kv } = await import("@vercel/kv")
    const limiter = new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(30, "1 h"), prefix: "" })
    const { success } = await limiter.limit(`rl_phone_${phone}`)
    return success
  } catch {
    return true // falha silenciosa — não bloqueia por erro de infra
  }
}

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Z-API espera sempre 200 — erros internos são logados, não retornados
  try {
    const payload: ZAPIPayload = await request.json()

    if (!payload.phone || !payload.message?.type) {
      return NextResponse.json({ ok: true })
    }

    // Previne loop infinito (bot respondendo a si mesmo) e ignora grupos
    if (payload.fromMe || payload.isGroup) {
      return NextResponse.json({ ok: true })
    }

    // Limite de payload Base64 (~5MB) para evitar gargalos de memória na Vercel e timeout no Gemini
    const base64Str = payload.message.imageBase64 || payload.message.audioBase64 || ""
    if (base64Str && base64Str.length * 0.75 > 5 * 1024 * 1024) {
      console.warn(`[webhook] Payload muito grande descartado: ${payload.phone}`)
      return NextResponse.json({ ok: true })
    }

    const allowed = await checkPhoneRateLimit(payload.phone)
    if (!allowed) {
      console.warn(`[webhook] rate limit atingido para ${payload.phone}`)
      return NextResponse.json({ ok: true })
    }

    const newMessage = mapToNewMessage(payload.message)
    if (!newMessage.content) return NextResponse.json({ ok: true })

    const history = await getHistory(payload.phone)
    const { result, updatedMessages } = await analyzeMessage(history, newMessage)

    await setHistory(payload.phone, updatedMessages)
    await sendMessage(payload.phone, result.raw)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[webhook] Erro interno:", error)
    return NextResponse.json({ ok: true })
  }
}
