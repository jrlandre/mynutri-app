/**
 * Micro-buffer para Axiom — não usa nenhum SDK em runtime.
 * Compatível com Edge Runtime e Node.js Lambda da Vercel.
 *
 * Fluxo:
 *   ingestEvent() → acumula no _buffer (no-op se token não configurado ou Edge)
 *   flushLogs()   → envia batch via fetch e drena o buffer
 *
 * Flush explícito via:
 *   - proxy.ts:             event.waitUntil(flushLogs())
 *   - /api/analyze:         after(flushLogs())
 *   - /api/stripe/webhook:  after(flushLogs())
 */

interface AxiomEvent {
  _time: string
  level: string
  context: string
  message: string
  [key: string]: unknown
}

// Módulo singleton — seguro porque Vercel Lambda é single-tenant (1 request por vez)
const _buffer: AxiomEvent[] = []

export function ingestEvent(event: AxiomEvent): void {
  // Edge Runtime (proxy.ts): fetch disparado por event.waitUntil, buffer separado não é necessário
  if (process.env.NEXT_RUNTIME === 'edge') return
  if (!process.env.NEXT_AXIOM_TOKEN || !process.env.NEXT_AXIOM_DATASET) return
  _buffer.push(event)
}

export async function flushLogs(): Promise<void> {
  const token = process.env.NEXT_AXIOM_TOKEN
  const dataset = process.env.NEXT_AXIOM_DATASET
  if (!token || !dataset || _buffer.length === 0) return

  // Drena o buffer atomicamente (JavaScript é single-threaded)
  const events = _buffer.splice(0)

  await fetch(`https://api.axiom.co/v1/datasets/${dataset}/ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(events),
  }).catch(() => {/* sem-op: não bloquear a resposta por falha de logging */})
}

/**
 * Envia UM evento isolado via fetch fire-and-forget.
 * Usado apenas no Edge Runtime (proxy.ts) onde não há buffer persistente entre requests.
 */
export function ingestEventEdge(event: AxiomEvent): void {
  const token = process.env.NEXT_AXIOM_TOKEN
  const dataset = process.env.NEXT_AXIOM_DATASET
  if (!token || !dataset) return

  fetch(`https://api.axiom.co/v1/datasets/${dataset}/ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([event]),
  }).catch(() => {})
}
