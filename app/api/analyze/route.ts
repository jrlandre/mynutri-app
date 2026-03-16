import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { kv } from "@vercel/kv"
import { analyzeMessage } from "@/lib/gemini/analyze"
import { createClient } from "@/lib/supabase/server"
import { checkAndIncrementUsage } from "@/lib/usage"
import type { Message, InputType, ContentType, TenantConfig } from "@/types"

const ipRatelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(15, "1 m"),
  prefix: "ratelimit_analyze_",
})

interface RequestBody {
  messages: Message[]
  newMessage: {
    contentType: ContentType
    content: string
    mimeType?: string
  }
  inputTypeHint?: InputType
}

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting por IP distribuído
    const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim()

    if (ip !== "unknown") {
      const limit = await ipRatelimit.limit(ip)
      if (!limit.success) {
        return NextResponse.json(
          { error: "Muitas análises em pouco tempo. Aguarde um minuto.", retryAfter: 60 },
          { status: 429 }
        )
      }
    }

    // Verificar limite de uso por tier
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const usageCheck = await checkAndIncrementUsage(user?.id ?? null)

    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: "limite_diario_atingido",
          tier: usageCheck.tier,
          count: usageCheck.count,
          limit: usageCheck.limit,
        },
        { status: 429 }
      )
    }

    // Resolver tenant config (multi-tenant)
    const tenantHeader = request.headers.get('x-tenant-config')
    const tenantConfig: TenantConfig | null = tenantHeader
      ? JSON.parse(tenantHeader)
      : null

    const body: RequestBody = await request.json()

    const contentType = body.newMessage?.contentType
    const content = body.newMessage?.content
    const mimeType = body.newMessage?.mimeType

    if (!contentType || content === undefined) {
      return NextResponse.json(
        { error: "newMessage.contentType e newMessage.content são obrigatórios" },
        { status: 400 }
      )
    }

    if (!["text", "image", "audio"].includes(contentType)) {
      return NextResponse.json(
        { error: "payload_invalido", message: "Conteúdo não reconhecido. Tente novamente." },
        { status: 400 }
      )
    }

    if (contentType === "text") {
      if (content.length > 2000) {
        return NextResponse.json(
          { error: "payload_invalido", message: "Texto muito longo." },
          { status: 400 }
        )
      }

      const lower = content.toLowerCase()
      const forbidden = [
        "ignore previous instructions",
        "ignore all instructions",
        "you are now",
        "new persona",
        "forget your instructions",
        "system prompt",
        "ignore as instruções",
      ]
      if (forbidden.some((p) => lower.includes(p))) {
        return NextResponse.json(
          { error: "payload_invalido", message: "Conteúdo não reconhecido. Tente novamente." },
          { status: 400 }
        )
      }
    }

    if (contentType === "image") {
      if (mimeType !== "image/jpeg" && mimeType !== "image/png") {
        return NextResponse.json(
          { error: "payload_invalido", message: "Formato de imagem não suportado." },
          { status: 400 }
        )
      }
      // base64 length * 0.75 ≈ bytes reais
      if (content.length * 0.75 > 4 * 1024 * 1024) {
        return NextResponse.json(
          { error: "payload_invalido", message: "Imagem muito grande." },
          { status: 400 }
        )
      }
    }

    if (contentType === "audio") {
      const validAudio = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav"]
      const ok = validAudio.some((t) => (mimeType ?? "").startsWith(t))
      if (!ok) {
        return NextResponse.json(
          { error: "payload_invalido", message: "Formato de áudio não suportado." },
          { status: 400 }
        )
      }
      if (content.length * 0.75 > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "payload_invalido", message: "Áudio muito longo." },
          { status: 400 }
        )
      }
    }

    const { result, updatedMessages } = await analyzeMessage(
      body.messages ?? [],
      body.newMessage,
      body.inputTypeHint,
      tenantConfig
    )

    return NextResponse.json({ result, updatedMessages })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
