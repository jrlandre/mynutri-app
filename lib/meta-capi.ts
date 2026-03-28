import crypto from 'crypto'

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

interface CAPIEvent {
  event_name: string
  event_id: string
  user_email?: string
  fbc?: string
  fbp?: string
  value?: number
  currency?: string
  source_url: string
}

export async function sendCAPIEvent(event: CAPIEvent): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const token = process.env.META_CAPI_ACCESS_TOKEN
  if (!pixelId || !token) return

  const payload = {
    data: [
      {
        event_name: event.event_name,
        event_id: event.event_id,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: event.source_url,
        user_data: {
          ...(event.user_email ? { em: [sha256(event.user_email)] } : {}),
          ...(event.fbc ? { fbc: event.fbc } : {}),
          ...(event.fbp ? { fbp: event.fbp } : {}),
        },
        ...(event.value !== undefined
          ? { custom_data: { value: event.value, currency: event.currency ?? 'BRL' } }
          : {}),
      },
    ],
  }

  await fetch(
    `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  ).catch(() => {})
}
