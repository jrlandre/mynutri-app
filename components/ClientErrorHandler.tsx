'use client'

import { useEffect } from 'react'

export function ClientErrorHandler() {
  useEffect(() => {
    function sendError(payload: Record<string, unknown>) {
      // fire-and-forget — não bloqueia o usuário
      fetch('/api/log-client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {/* silencioso se offline */})
    }

    function handleError(event: ErrorEvent) {
      sendError({
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        url: window.location.href,
      })
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason
      sendError({
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        url: window.location.href,
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null
}
