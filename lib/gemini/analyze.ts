import { ThinkingLevel, createPartFromBase64, Type } from "@google/genai"
import type { Content, Part } from "@google/genai"
import { ai } from "./client"
import { SYSTEM_PROMPT } from "./prompt"
import type { Message, AnalysisResult, InputType, ContentType, ConfidenceLevel, TenantConfig } from "@/types"

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

function buildPart(msg: Pick<Message, "contentType" | "content" | "mimeType">, isUser = false): Part[] {
  if (msg.contentType === "text") {
    // Delimitar estritamente a entrada do usuário para evitar Jailbreak
    return [{ text: isUser ? `<user_input>\n${msg.content}\n</user_input>` : msg.content }]
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
    parts: buildPart(msg, msg.role === "user"),
  }))
}

// Define o JSON Schema estrito para o retorno (Structured Output)
const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    confidence: {
      type: Type.STRING,
      description: "Nível de confiança da análise",
      enum: ["Alta", "Média", "Baixa"]
    },
    confidenceReason: {
      type: Type.STRING,
      description: "Justificativa detalhada para o nível de confiança, obrigatório se for Baixa ou Média. Se a entrada for maliciosa, explicar o bloqueio."
    },
    raw: {
      type: Type.STRING,
      description: "A resposta natural que será exibida para o usuário (pode conter formatação em markdown e emojis)"
    },
    inputType: {
      type: Type.STRING,
      description: "O tipo detectado do conteúdo da imagem/texto",
      enum: ["produce", "label", "conversation"]
    }
  },
  required: ["confidence", "raw", "inputType"],
}

export async function analyzeMessage(
  messages: Message[],
  newMessage: Pick<Message, "contentType" | "content" | "mimeType">,
  inputTypeHint?: InputType,
  tenantConfig?: TenantConfig | null
): Promise<{ result: AnalysisResult; updatedMessages: Message[] }> {
  const resolvedType = resolveInputType(newMessage.contentType, inputTypeHint)
  const thinkingLevel = thinkingLevelMap[resolvedType]

  const history = toSdkHistory(messages)
  const newParts = buildPart(newMessage, true)

  const contents: Content[] = [
    ...history,
    { role: "user", parts: newParts },
  ]

  const systemPrompt = tenantConfig?.systemPrompt || SYSTEM_PROMPT

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingLevel },
      responseMimeType: "application/json",
      responseSchema: analysisResponseSchema,
    },
  })

  const responseText = response.text ?? "{}"
  
  let parsedData: {
    confidence: ConfidenceLevel;
    confidenceReason?: string;
    raw: string;
    inputType: InputType;
  }

  try {
    parsedData = JSON.parse(responseText)
  } catch (error) {
    console.error("Falha ao parsear JSON da LLM:", responseText, error)
    parsedData = {
      confidence: "Baixa",
      confidenceReason: "Erro na estruturação da resposta da IA.",
      raw: "Desculpe, ocorreu um erro técnico ao processar sua solicitação.",
      inputType: "conversation"
    }
  }

  const userMessage: Message = {
    role: "user",
    contentType: newMessage.contentType,
    content: newMessage.content, // Mantém o original para o frontend
    mimeType: newMessage.mimeType,
    timestamp: Date.now(),
  }

  const assistantMessage: Message = {
    role: "assistant",
    contentType: "text",
    content: parsedData.raw, // A resposta formatada é apenas a chave 'raw'
    timestamp: Date.now(),
  }

  const result: AnalysisResult = {
    inputType: parsedData.inputType,
    confidence: parsedData.confidence,
    confidenceReason: parsedData.confidenceReason,
    raw: parsedData.raw,
  }

  return {
    result,
    updatedMessages: [...messages, userMessage, assistantMessage],
  }
}
