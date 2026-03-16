type MessageRole = "user" | "assistant"
type ContentType = "text" | "image" | "audio"
type ConfidenceLevel = "Alta" | "Média" | "Baixa"
type InputType = "produce" | "label" | "conversation"
type RipenessState =
  | "Verde"
  | "Pré-maturação"
  | "Ponto ideal"
  | "Passando"
  | "Impróprio"
type ProcessingLevel =
  | "in natura"
  | "minimamente processado"
  | "ingrediente culinário processado"
  | "processado"
  | "ultraprocessado"

interface Message {
  role: MessageRole
  contentType: ContentType
  content: string
  mimeType?: string
  timestamp: number
}

interface AnalysisResult {
  inputType: InputType
  confidence: ConfidenceLevel
  confidenceReason?: string
  raw: string
}

interface SessionState {
  messages: Message[]
  analyses: AnalysisResult[]
}

interface TenantConfig {
  subdomain: string
  nutritionistName: string
  systemPrompt: string
}

export type {
  MessageRole,
  ContentType,
  ConfidenceLevel,
  InputType,
  RipenessState,
  ProcessingLevel,
  Message,
  AnalysisResult,
  SessionState,
  TenantConfig,
}
