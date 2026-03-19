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
  expertName: string
  systemPrompt: string
}

interface ContactLink {
  type: 'whatsapp' | 'instagram' | 'email' | 'website' | string
  label: string
  url: string
}

interface Expert {
  id: string
  user_id: string
  subdomain: string
  name: string
  specialty: string | null
  city: string | null
  photo_url: string | null
  contact_links: ContactLink[]
  listed: boolean
  system_prompt: string | null
  plan: 'standard' | 'enterprise'
  active: boolean
  is_admin?: boolean
}

interface Client {
  id: string
  user_id: string | null
  expert_id: string
  email: string | null
  active: boolean
  magic_link_token: string | null
  invited_at: string
  activated_at: string | null
}

interface UserProfile {
  email: string
  name?: string | null
  expertName?: string | null
  hasPanel?: boolean
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
  ContactLink,
  Expert,
  Client,
  UserProfile,
}
