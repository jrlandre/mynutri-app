import { ThinkingLevel, createPartFromBase64 } from "@google/genai"
import type { Content, Part } from "@google/genai"
import { ai } from "./client"
import { SYSTEM_PROMPT } from "./prompt"
import type { Message, AnalysisResult, InputType, ContentType, ConfidenceLevel } from "@/types"

const MODEL = "gemini-3-flash-preview"

const thinkingLevelMap: Record<InputType, ThinkingLevel> = {
  produce: ThinkingLevel.LOW,
  label: ThinkingLevel.MEDIUM,
  conversation: ThinkingLevel.MINIMAL,
}

function resolveInputType(contentType: ContentType, hint?: InputType): InputType {
  if (contentType === "text" || contentType === "audio") return "conversation"
  return hint ?? "produce"
}

function detectInputType(text: string): InputType {
  if (text.includes("MATURAÇÃO") || text.includes("Janela de consumo")) return "produce"
  if (text.includes("O QUE É ISSO") || text.includes("O QUE CHAMA ATENÇÃO")) return "label"
  return "conversation"
}

function parseConfidence(text: string): ConfidenceLevel {
  const match = text.match(/CONFIANÇA:[*\s]*(Alta|Média|Baixa)/i)
  return (match?.[1] as ConfidenceLevel) ?? "Média"
}

function parseConfidenceReason(text: string): string | undefined {
  const match = text.match(/CONFIANÇA:[*\s]*Baixa[*\s]*\n([^\n]+)/i)
  return match?.[1]?.trim()
}

function buildPart(msg: Pick<Message, "contentType" | "content" | "mimeType">): Part[] {
  if (msg.contentType === "text") {
    return [{ text: msg.content }]
  }
  if (msg.contentType === "image") {
    return [createPartFromBase64(msg.content, msg.mimeType ?? "image/jpeg")]
  }
  if (msg.contentType === "audio") {
    return [createPartFromBase64(msg.content, msg.mimeType ?? "audio/webm")]
  }
  return [{ text: msg.content }]
}

function toSdkHistory(messages: Message[]): Content[] {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: buildPart(msg),
  }))
}

export async function analyzeMessage(
  messages: Message[],
  newMessage: Pick<Message, "contentType" | "content" | "mimeType">,
  inputTypeHint?: InputType
): Promise<{ result: AnalysisResult; updatedMessages: Message[] }> {
  const resolvedType = resolveInputType(newMessage.contentType, inputTypeHint)
  const thinkingLevel = thinkingLevelMap[resolvedType]

  const history = toSdkHistory(messages)
  const newParts = buildPart(newMessage)

  const contents: Content[] = [
    ...history,
    { role: "user", parts: newParts },
  ]

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      thinkingConfig: { thinkingLevel },
    },
  })

  const responseText = response.text ?? ""

  const userMessage: Message = {
    role: "user",
    contentType: newMessage.contentType,
    content: newMessage.content,
    mimeType: newMessage.mimeType,
    timestamp: Date.now(),
  }

  const assistantMessage: Message = {
    role: "assistant",
    contentType: "text",
    content: responseText,
    timestamp: Date.now(),
  }

  const result: AnalysisResult = {
    inputType: detectInputType(responseText),
    confidence: parseConfidence(responseText),
    confidenceReason: parseConfidenceReason(responseText),
    raw: responseText,
  }

  return {
    result,
    updatedMessages: [...messages, userMessage, assistantMessage],
  }
}
