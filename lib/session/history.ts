import type { Message } from "@/types"
import { logger } from "@/lib/logger"

const TTL_SECONDS = 60 * 60 * 24 * 7 // 7 dias

// Fallback em memória para dev local sem KV configurado
const devStore = new Map<string, Message[]>()
const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

export async function getHistory(phone: string): Promise<Message[]> {
  if (!hasKV) {
    if (process.env.NODE_ENV === "development") {
      logger.warn('session', 'KV não configurado — usando Map em memória (dev only)')
    }
    return devStore.get(phone) ?? []
  }
  // Import dinâmico para não quebrar o build quando as env vars não estão presentes
  const { kv } = await import("@vercel/kv")
  return (await kv.get<Message[]>(phone)) ?? []
}

export async function setHistory(phone: string, messages: Message[]): Promise<void> {
  if (!hasKV) {
    devStore.set(phone, messages)
    return
  }
  const { kv } = await import("@vercel/kv")
  await kv.set(phone, messages, { ex: TTL_SECONDS })
}
