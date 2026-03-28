/**
 * Utility para client components reportarem erros capturados ao backend.
 * Não lança exceções — falha silenciosa para não piorar o estado de erro.
 */
export function reportError(message: string, error?: unknown, extra?: Record<string, unknown>) {
  const stack = error instanceof Error ? error.stack : undefined
  const detail = error instanceof Error ? error.message : error !== undefined ? String(error) : undefined

  fetch('/api/log-client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      stack: stack?.substring(0, 500),
      detail,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...extra,
    }),
    keepalive: true,
  }).catch(() => {/* sem-op se offline */})
}
