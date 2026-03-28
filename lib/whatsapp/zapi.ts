import { logger } from "@/lib/logger"

const BASE_URL = "https://api.z-api.io/instances"

export async function sendMessage(phone: string, text: string): Promise<void> {
  const { ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_SECURITY_TOKEN } = process.env

  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_SECURITY_TOKEN) {
    logger.warn('zapi', 'Credenciais não configuradas — mensagem não enviada')
    return
  }

  const url = `${BASE_URL}/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_SECURITY_TOKEN,
    },
    body: JSON.stringify({ phone, message: text }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Z-API error ${res.status}: ${body}`)
  }
}
