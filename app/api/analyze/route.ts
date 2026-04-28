import { NextRequest, NextResponse, after } from "next/server"
import { flushLogs } from "@/lib/axiom"
import { captureServerEvent } from "@/lib/posthog"
import { analyzeMessage } from "@/lib/gemini/analyze"
import { ai } from "@/lib/gemini/client"
import { ThinkingLevel } from "@google/genai"
import { createClient } from "@/lib/supabase/server"
import { adminClient } from "@/lib/supabase/admin"
import { checkAndIncrementUsage } from "@/lib/usage"
import { logger } from "@/lib/logger"
import type { Message, InputType, ContentType, TenantConfig } from "@/types"

async function buildIpRatelimit() {
  const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  if (!hasKV) return null
  const { Ratelimit } = await import("@upstash/ratelimit")
  const { kv } = await import("@vercel/kv")
  return new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(15, "1 m"), prefix: "ratelimit_analyze_" })
}

interface RequestBody {
  sessionId?: string
  messages: Message[]
  newMessage: {
    contentType: ContentType
    content: string
    mimeType?: string
  }
  inputTypeHint?: InputType
  tenantSubdomain?: string
}

export const maxDuration = 60;

async function generateSessionTitle(sessionId: string, userId: string, firstMessageContent: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: `Gere um título curto e descritivo (máx 5 palavras) para uma conversa que começou assim: "${firstMessageContent.substring(0, 200)}"` }] }],
      config: {
        systemInstruction: "Você é um assistente que cria títulos curtos e diretos para conversas. Responda apenas com o título, sem aspas.",
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
      }
    })

    let title = response.text?.trim()
    if (title) {
      title = title.replace(/^["']|["']$/g, "")
      await adminClient
        .from("chat_sessions")
        .update({ title })
        .eq("id", sessionId)
        .eq("user_id", userId)
    }
  } catch (error) {
    logger.error("analyze/generateSessionTitle", "Erro ao gerar título", { error, sessionId, userId })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? undefined
  try {
    // Rate limiting por IP distribuído
    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null
    const ipRatelimit = await buildIpRatelimit()

    if (ip && ipRatelimit) {
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
    const usageCheck = await checkAndIncrementUsage(user?.id ?? null, ip)

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

    const body: RequestBody = await request.json()

    // Resolver tenant config (multi-tenant)
    // Prioridade: header x-tenant-subdomain (injetado pelo proxy) > body.tenantSubdomain (fallback)
    const tenantSubdomain = request.headers.get('x-tenant-subdomain') ?? body.tenantSubdomain ?? null
    let tenantConfig: TenantConfig | null = null
    if (tenantSubdomain) {
      const { data: expert } = await adminClient
        .from('experts')
        .select('name, system_prompt')
        .eq('subdomain', tenantSubdomain)
        .eq('active', true)
        .maybeSingle()
      if (expert) {
        tenantConfig = {
          subdomain: tenantSubdomain,
          expertName: expert.name,
          systemPrompt: expert.system_prompt ?? '',
        }
      }
    }

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

    let sessionId = body.sessionId
    let isNewSession = false

    // Historico DB
    if (user) {
      if (!sessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from("chat_sessions")
          .insert({ user_id: user.id })
          .select("id")
          .single()

        if (sessionError) {
          logger.error('analyze', 'Falha ao criar sessão', { error: sessionError.message, requestId, userId: user.id })
        } else if (newSession) {
          sessionId = newSession.id
          isNewSession = true
        }
      }

      if (sessionId) {
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          role: "user",
          content_type: contentType,
          content: content,
          mime_type: mimeType || null
        })
      }
    }

    const { result, updatedMessages } = await analyzeMessage(
      body.messages ?? [],
      body.newMessage,
      body.inputTypeHint,
      tenantConfig
    )

    if (user && sessionId) {
      await Promise.all([
        supabase.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content_type: "text",
          content: JSON.stringify(result),
          mime_type: null
        }),
        supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId),
      ])

      if (isNewSession) {
        const titleContent = contentType === "text" ? content : result.raw
        after(generateSessionTitle(sessionId, user.id, titleContent))
      }
    }

    // Telemetria PostHog — fire-and-forget, não bloqueia resposta
    after(async () => {
      if (!user?.id) return
      const tier = usageCheck.tier

      if (tier === 'client' && isNewSession) {
        await captureServerEvent(user.id, 'client_first_analysis')
      }
      if (tier === 'free' && isNewSession) {
        await captureServerEvent(user.id, 'organic_user_no_expert', { has_expert: false })
      }
      // client_returned_d1: nova sessão de cliente no dia seguinte à ativação
      if (tier === 'client' && isNewSession) {
        const { data: clientRow } = await adminClient
          .from('clients')
          .select('activated_at')
          .eq('user_id', user.id)
          .eq('active', true)
          .maybeSingle()
        if (clientRow?.activated_at) {
          const d1 = new Date(clientRow.activated_at)
          d1.setUTCDate(d1.getUTCDate() + 1)
          const isD1 = d1.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
          if (isD1) await captureServerEvent(user.id, 'client_returned_d1')
        }
      }
    })

    after(flushLogs())
    return NextResponse.json({ result, updatedMessages, sessionId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    after(flushLogs())
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
