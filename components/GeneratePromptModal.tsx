"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Sparkles, Check, AlertTriangle, Loader2, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Tooltip } from '@/components/Tooltip'

interface Props {
  expertId: string
  locale: string
  onApply: (prompt: string) => void
  onClose: () => void
}

type PipelineState =
  | 'idle'
  | 'uploading_supabase'
  | 'uploading_gemini'
  | 'polling'
  | 'streaming'
  | 'review'
  | 'error'

const MAX_TOTAL_SIZE = 15 * 1024 * 1024
const ALLOWED_EXT = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.mp3', '.wav', '.mp4', '.txt', '.md'])

async function post(url: string, body: unknown, opts?: { signal?: AbortSignal }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts?.signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error((err as { error?: string }).error ?? 'request_failed'), { status: res.status, data: err })
  }
  return res.json()
}

async function postWithRetry(
  url: string,
  body: unknown,
  opts: { retries: number; signal?: AbortSignal }
) {
  let lastErr: unknown
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await post(url, body, { signal: opts.signal })
    } catch (err: unknown) {
      const e = err as { name?: string; status?: number }
      if (e.name === 'AbortError') throw err
      if (typeof e.status === 'number' && e.status >= 400 && e.status < 500) throw err
      lastErr = err
      if (attempt < opts.retries) {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 2 ** attempt * 500)
          opts.signal?.addEventListener('abort', () => {
            clearTimeout(t)
            reject(new DOMException('Aborted', 'AbortError'))
          }, { once: true })
        })
      }
    }
  }
  throw lastErr
}

async function uploadAllToSupabase(
  files: File[],
  paths: string[],
  supabase: ReturnType<typeof createClient>,
  signal: AbortSignal
): Promise<void> {
  const uploaded: string[] = []
  try {
    for (let i = 0; i < files.length; i++) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      const { error } = await supabase.storage
        .from('expert-materials')
        .upload(paths[i], files[i], { upsert: false })
      if (error) throw new Error(`supabase_upload_failed: ${error.message}`)
      uploaded.push(paths[i])
    }
  } catch (err) {
    if (uploaded.length > 0) {
      await supabase.storage.from('expert-materials').remove(uploaded).catch(() => {})
    }
    throw err
  }
}

async function pollUntilReady(jobId: string, timeoutMs: number, signal: AbortSignal): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const pollSignal = AbortSignal.any([signal, AbortSignal.timeout(15_000)])
    const res = await fetch(`/api/painel/generate-prompt/poll?job_id=${jobId}`, { signal: pollSignal })

    if (!res.ok && res.status !== 422) throw new Error(`poll_http_error_${res.status}`)

    const data = await res.json()
    if (res.status === 422 || data.all_failed) throw new Error('all_files_failed')
    if (data.ready) return

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, 3_000)
      signal.addEventListener('abort', () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      }, { once: true })
    })
  }
  throw new Error('poll_timeout')
}

export default function GeneratePromptModal({ expertId, locale, onApply, onClose }: Props) {
  const t = useTranslations('Painel')
  const supabase = createClient()

  const [files, setFiles] = useState<File[]>([])
  const [state, setState] = useState<PipelineState>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [streamingText, setStreamingText] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [usesRemaining, setUsesRemaining] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const totalSize = files.reduce((s, f) => s + f.size, 0)
  const isOverLimit = totalSize > MAX_TOTAL_SIZE

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming).filter(f => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
      return ALLOWED_EXT.has(ext)
    })
    setFiles(prev => {
      const merged = [...prev, ...arr]
      return merged.slice(0, 10)
    })
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  function mapError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('limit_reached')) return 'gp_err_limit_reached'
    if (msg.includes('all_files_failed') || msg.includes('gp_err_files_not_ready')) return 'gp_err_files_not_ready'
    if (msg.includes('session_expired')) return 'gp_err_session_expired'
    if (msg.includes('generate_failed') || msg.includes('files_not_ready')) return 'gp_err_generate_failed'
    if (msg.includes('upload_network') || msg.includes('supabase_upload')) return 'gp_err_upload_network'
    return 'gp_err_generic'
  }

  const runPipeline = useCallback(async () => {
    if (files.length === 0 || isOverLimit) return
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    try {
      const basePaths = files.map(f =>
        `${expertId}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      )
      const fileSizes = files.map(f => f.size)

      const { job_id, uses_remaining } = await post(
        '/api/painel/generate-prompt/start',
        { paths: basePaths, fileSizes, locale },
        { signal }
      )
      setUsesRemaining(uses_remaining)

      setState('uploading_supabase')
      await uploadAllToSupabase(files, basePaths, supabase, signal)

      setState('uploading_gemini')
      setProgress({ current: 0, total: basePaths.length })
      for (let i = 0; i < basePaths.length; i++) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
        setProgress({ current: i + 1, total: basePaths.length })
        await postWithRetry(
          '/api/painel/generate-prompt/upload-file',
          { job_id, path: basePaths[i] },
          { retries: 3, signal }
        )
      }

      setState('polling')
      await pollUntilReady(job_id, 300_000, signal)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('session_expired')

      const res = await fetch('/api/painel/generate-prompt/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ job_id, locale }),
        signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'generate_failed')
      }

      setState('streaming')
      setStreamingText('')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            accumulated += decoder.decode()
            break
          }
          accumulated += decoder.decode(value, { stream: true })
          setStreamingText(accumulated)
        }
      } catch (err: unknown) {
        const e = err as { name?: string }
        if (e.name === 'AbortError') return
        throw err
      }

      setGeneratedPrompt(accumulated)
      setState('review')
    } catch (err: unknown) {
      const e = err as { name?: string }
      if (e.name === 'AbortError') return
      setErrorKey(mapError(err))
      setState('error')
    }
  }, [files, isOverLimit, expertId, locale, supabase])

  function handleCancel() {
    abortRef.current?.abort()
    setState('idle')
    setStreamingText('')
    setErrorKey(null)
  }

  function handleApply() {
    onApply(generatedPrompt)
    onClose()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const isRunning = ['uploading_supabase', 'uploading_gemini', 'polling', 'streaming'].includes(state)

  function stateLabel(): string {
    if (state === 'uploading_supabase') return t('gp_state_uploading_supabase')
    if (state === 'uploading_gemini') return t('gp_state_uploading_gemini', { current: progress.current, total: progress.total })
    if (state === 'polling') return t('gp_state_polling')
    if (state === 'streaming') return t('gp_state_streaming')
    if (state === 'review') return t('gp_state_review')
    return ''
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !isRunning) onClose() }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <p className="font-semibold text-sm">{t('gp_title')}</p>
            <Tooltip content={t('gp_beta_tooltip')} side="bottom">
              <span className="cursor-default text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5 leading-none select-none">
                Beta
              </span>
            </Tooltip>
          </div>
          {!isRunning && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">
          {/* Idle / file picker */}
          {(state === 'idle' || state === 'error') && (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('gp_description')}</p>

              {/* Drop zone */}
              <div
                ref={dropRef}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.multiple = true
                  input.accept = '.pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.mp4,.txt,.md'
                  input.onchange = e => addFiles((e.target as HTMLInputElement).files ?? [])
                  input.click()
                }}
                className={`border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">{t('gp_upload_label')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('gp_upload_hint')}</p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border">
                      <FileText size={14} className="text-muted-foreground shrink-0" />
                      <p className="text-xs flex-1 truncate">{f.name}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{formatSize(f.size)}</span>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div className={`flex items-center justify-between px-1 mt-0.5 ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                    <span className="text-xs">{t('gp_total_size')}: {formatSize(totalSize)}</span>
                    {isOverLimit && (
                      <span className="text-xs font-medium flex items-center gap-1">
                        <AlertTriangle size={12} /> {t('gp_err_invalid_files')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {state === 'error' && errorKey && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                  <AlertTriangle size={16} className="shrink-0" />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {t(errorKey as any)}
                </div>
              )}

              {usesRemaining !== null && (
                <p className="text-xs text-muted-foreground text-right">
                  {t('gp_uses_remaining', { count: usesRemaining })}
                </p>
              )}
            </>
          )}

          {/* Running states */}
          {isRunning && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm font-medium text-center">{stateLabel()}</p>
              {state === 'streaming' && streamingText && (
                <div className="w-full px-4 py-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground leading-relaxed max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
                  {streamingText}
                </div>
              )}
              <button
                onClick={handleCancel}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                {t('gp_btn_cancel')}
              </button>
            </div>
          )}

          {/* Review state */}
          {state === 'review' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
                <Check size={16} className="shrink-0" />
                <p className="text-sm font-medium">{stateLabel()}</p>
              </div>
              <textarea
                value={generatedPrompt}
                onChange={e => setGeneratedPrompt(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none leading-relaxed font-mono"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          {state === 'review' ? (
            <div className="flex gap-3">
              <button
                onClick={() => { setState('idle'); setFiles([]); setGeneratedPrompt('') }}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                {t('gp_btn_regenerate')}
              </button>
              <button
                onClick={handleApply}
                disabled={!generatedPrompt.trim()}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check size={16} /> {t('gp_btn_apply')}
              </button>
            </div>
          ) : !isRunning ? (
            <button
              onClick={runPipeline}
              disabled={files.length === 0 || isOverLimit}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> {t('gp_btn_generate')}
            </button>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  )
}
