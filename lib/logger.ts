import { ingestEvent, ingestEventEdge } from '@/lib/axiom'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogMeta {
  requestId?: string
  userId?: string
  ip?: string
  tenant?: string
  durationMs?: number
  error?: unknown
  [key: string]: unknown
}

interface LogEntry extends LogMeta {
  level: LogLevel
  context: string
  message: string
}

function serializeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try { return JSON.stringify(err) } catch { return String(err) }
}

function emit(entry: LogEntry) {
  const { level, context, message, error, ...meta } = entry

  const errorStr = error !== undefined ? serializeError(error) : undefined
  const payload = {
    ...(errorStr !== undefined ? { error: errorStr } : {}),
    ...meta,
  }
  const hasPayload = Object.keys(payload).length > 0

  if (process.env.NODE_ENV !== 'production') {
    const tag = `[${level.toUpperCase()}] [${context}]`
    const suffix = hasPayload ? ' ' + JSON.stringify(payload) : ''
    if (level === 'error') {
      console.error(`${tag} ${message}${suffix}`)
    } else if (level === 'warn') {
      console.warn(`${tag} ${message}${suffix}`)
    } else {
      console.log(`${tag} ${message}${suffix}`)
    }
    return
  }

  // Produção: JSON estruturado → capturado pelo Vercel → enviado ao Log Drain
  const structured = {
    ts: new Date().toISOString(),
    level,
    context,
    message,
    ...(errorStr !== undefined ? { error: errorStr } : {}),
    ...meta,
  }
  console.log(JSON.stringify(structured))

  // Axiom — envia diretamente sem passar pelo Log Drain (sem Vercel Pro)
  const axiomEvent = { _time: structured.ts, level, context, message, ...(errorStr !== undefined ? { error: errorStr } : {}), ...meta }
  if (process.env.NEXT_RUNTIME === 'edge') {
    ingestEventEdge(axiomEvent)
  } else {
    ingestEvent(axiomEvent)
  }
}

export const logger = {
  info(context: string, message: string, meta?: LogMeta) {
    emit({ level: 'info', context, message, ...meta })
  },
  warn(context: string, message: string, meta?: LogMeta) {
    emit({ level: 'warn', context, message, ...meta })
  },
  error(context: string, message: string, meta?: LogMeta) {
    emit({ level: 'error', context, message, ...meta })
  },
  debug(context: string, message: string, meta?: LogMeta) {
    if (process.env.NODE_ENV !== 'production') {
      emit({ level: 'debug', context, message, ...meta })
    }
  },
}
