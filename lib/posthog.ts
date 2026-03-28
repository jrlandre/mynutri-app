/**
 * PostHog — captura server-side via REST API.
 * Fire-and-forget, mesmo padrão do lib/axiom.ts.
 * Não usa posthog-node — apenas fetch nativo.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com'
  if (!key || !distinctId) return

  await fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      distinct_id: distinctId,
      event,
      properties: { $lib: 'posthog-server', ...properties },
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {/* sem-op: telemetria não bloqueia resposta */})
}
