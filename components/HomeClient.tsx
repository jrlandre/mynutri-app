"use client"

import { useState, useRef, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { LogOut, LayoutDashboard, ShieldCheck, History, X, MessageSquare, Trash, Play, Pause } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import SessionHistory from "@/components/SessionHistory"
import PaywallScreen from "@/components/PaywallScreen"
import LoginGateScreen from "@/components/LoginGateScreen"
import { compressImage } from "@/lib/compress-image"
import type { SessionState, AnalysisResult, InputType, UserProfile, Message } from "@/types"

interface Props {
  tenantSubdomain?: string
  userProfile?: UserProfile | null
}

interface SessionMeta {
  id: string
  title: string | null
  created_at: string
}

function PearIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="w-6 h-6 drop-shadow-md"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="pearGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#E6EE9C" />
          <stop offset="50%" stopColor="#CDDC39" />
          <stop offset="100%" stopColor="#9E9D24" />
        </radialGradient>
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5D6A7" />
          <stop offset="100%" stopColor="#388E3C" />
        </linearGradient>
      </defs>
      {/* Cabo */}
      <path d="M15 8 L17 8 L17 4 C17 2 19 1 19 1 L18 0 C15 0 15 4 15 8 Z" fill="#6D4C41" />
      {/* Folha esquerda (caída) */}
      <path d="M15 6 C10 5 6 8 6 11 C9 12 13 9 15 6 Z" fill="url(#leafGrad)" />
      {/* Folha direita (mais caída) */}
      <path d="M17 5.5 C21.5 2 28 4.5 27.5 8 C24.5 11.5 18.5 8.5 17 5.5 Z" fill="url(#leafGrad)" />
      {/* Corpo da Pera */}
      <path
        d="M16 8 C19.5 8 21 13 23 17 C26 23 23 30 16 30 C9 30 6 23 9 17 C11 13 12.5 8 16 8 Z"
        fill="url(#pearGrad)"
      />
      {/* Reflexo / Brilho suave */}
      <path
        d="M10 18 C8 22 9 26 12 28 C10 26 10 21 11 18 Z"
        fill="#FFFFFF"
        opacity="0.35"
      />
    </svg>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}

export default function HomeClient({ tenantSubdomain, userProfile }: Props) {
  const [session, setSession] = useState<SessionState>({ messages: [], analyses: [] })
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sessionsList, setSessionsList] = useState<SessionMeta[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [loading, setLoading] = useState(false)
  const [inputText, setInputText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [pendingAudio, setPendingAudio] = useState<{ base64: string; mimeType: string } | null>(null)
  const [isProcessingAudio, setIsProcessingAudio] = useState(false)
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const [audioPlayer, setAudioPlayer] = useState<{ isPlaying: boolean; currentTime: number; duration: number }>({ isPlaying: false, currentTime: 0, duration: 0 })
  const [paywalled, setPaywalled] = useState(false)
  const [loginGated, setLoginGated] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxRecordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const MAX_RECORDING_SECONDS = 90

  const isEmpty = session.analyses.length === 0

  useEffect(() => {
    if (historyOpen && userProfile) {
      void fetchSessions()
    }
  }, [historyOpen, userProfile])

  useEffect(() => {
    if (!pendingAudio) {
      audioRef.current?.pause()
      audioRef.current = null
      setAudioPlayer({ isPlaying: false, currentTime: 0, duration: 0 })
      return
    }
    const audio = new Audio(`data:${pendingAudio.mimeType};base64,${pendingAudio.base64}`)
    audio.onloadedmetadata = () => setAudioPlayer(s => ({ ...s, duration: audio.duration }))
    audio.ontimeupdate = () => setAudioPlayer(s => ({ ...s, currentTime: audio.currentTime }))
    audio.onended = () => setAudioPlayer(s => ({ ...s, isPlaying: false, currentTime: 0 }))
    audioRef.current = audio
    return () => { audio.pause() }
  }, [pendingAudio])

  function handleTogglePlayback() {
    const audio = audioRef.current
    if (!audio) return
    if (audioPlayer.isPlaying) {
      audio.pause()
      setAudioPlayer(s => ({ ...s, isPlaying: false }))
    } else {
      void audio.play()
      setAudioPlayer(s => ({ ...s, isPlaying: true }))
    }
  }

  function formatAudioTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  async function fetchSessions() {
    setLoadingHistory(true)
    try {
      const res = await fetch("/api/chat/sessions")
      if (res.ok) {
        const data = await res.json() as { sessions?: SessionMeta[] }
        setSessionsList(data.sessions ?? [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }

  async function loadSession(id: string) {
    setSessionId(id)
    setHistoryOpen(false)
    setSession({ messages: [], analyses: [] })
    setLoading(true)
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${id}`)
      if (res.ok) {
        const data = await res.json() as {
          messages?: {
            id: string
            role: "user" | "assistant"
            content_type: "text" | "image" | "audio"
            content: string
            mime_type: string | null
            created_at: string
          }[]
        }
        
        const loadedMessages: Message[] = []
        const loadedAnalyses: AnalysisResult[] = []

        for (const m of (data.messages ?? [])) {
          if (m.role === 'user') {
            loadedMessages.push({
              role: m.role,
              contentType: m.content_type,
              content: m.content,
              mimeType: m.mime_type ?? undefined,
              timestamp: new Date(m.created_at).getTime()
            })
          } else {
            try {
              const parsed = JSON.parse(m.content) as AnalysisResult
              loadedAnalyses.push(parsed)
              loadedMessages.push({
                role: m.role,
                contentType: m.content_type,
                content: parsed.raw || m.content,
                timestamp: new Date(m.created_at).getTime()
              })
            } catch {
              loadedAnalyses.push({
                inputType: 'conversation',
                confidence: 'Média',
                raw: m.content
              })
              loadedMessages.push({
                role: m.role,
                contentType: m.content_type,
                content: m.content,
                timestamp: new Date(m.created_at).getTime()
              })
            }
          }
        }
        setSession({ messages: loadedMessages, analyses: loadedAnalyses })
      }
    } catch (e) {
      console.error("Erro ao carregar sessão", e)
    } finally {
      setLoading(false)
    }
  }

  function handleNewChat() {
    setSession({ messages: [], analyses: [] })
    setSessionId(null)
    setHistoryOpen(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setSession({ messages: [], analyses: [] })
    window.location.href = "/"
  }

  async function submit(
    contentType: "text" | "image" | "audio",
    content: string,
    mimeType?: string,
    inputTypeHint?: InputType
  ) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: session.messages,
          newMessage: { contentType, content, mimeType },
          inputTypeHint,
          ...(tenantSubdomain ? { tenantSubdomain } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; message?: string; tier?: string }
        if (res.status === 429) {
          if (data.error === "limite_diario_atingido" || data.error === "limite_atingido") {
            if (data.tier === 'anon') {
              setLoginGated(true)
            } else {
              setPaywalled(true)
            }
            return
          }
          throw new Error(data.message ?? "Muitas análises em pouco tempo. Tente novamente.")
        }
        throw new Error(data.message ?? data.error ?? `Erro ${res.status}`)
      }
      const data = await res.json() as {
        result: AnalysisResult
        updatedMessages: Message[]
        sessionId?: string
      }
      
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId)
      }

      setSession((prev) => ({
        messages: data.updatedMessages,
        analyses: [...prev.analyses, data.result],
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  async function handleCorrectType(index: number, newType: InputType) {
    const userMsgIndex = index * 2
    const userMsg = session.messages[userMsgIndex]
    if (!userMsg) return

    const previousMessages = session.messages.slice(0, userMsgIndex)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: previousMessages,
          newMessage: {
            contentType: userMsg.contentType,
            content: userMsg.content,
            mimeType: userMsg.mimeType,
          },
          inputTypeHint: newType,
          ...(tenantSubdomain ? { tenantSubdomain } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `Erro ${res.status}`)
      }
      const data = await res.json() as {
        result: AnalysisResult
        updatedMessages: Message[]
      }
      data.result.inputType = newType
      setSession((prev) => {
        const analyses = prev.analyses.map((a, i) => (i === index ? data.result : a))
        const messages = [
          ...previousMessages,
          ...data.updatedMessages.slice(previousMessages.length),
          ...prev.messages.slice(userMsgIndex + 2),
        ]
        return { messages, analyses }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  function handleText(e: React.FormEvent) {
    e.preventDefault()
    const text = inputText.trim()
    if (!text || isRecording) return
    setInputText("")
    inputRef.current?.focus()
    void submit("text", text)
  }

  function handleCameraCapture() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const base64 = await compressImage(file)
        void submit("image", base64, "image/jpeg")
      } catch {
        // silenciosamente ignora
      }
    }
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }

  async function handleStartRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        const reader = new FileReader()
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string
          const [prefix, base64] = dataUrl.split(",")
          const mimeType = prefix.replace("data:", "").replace(";base64", "")
          // Ambos na mesma atualização React — sem flash de estado normal entre eles
          setIsProcessingAudio(false)
          setIsRecording(false)
          setPendingAudio({ base64, mimeType })
        }
        reader.readAsDataURL(blob)
      }

      recorderRef.current = recorder
      recorder.start()
      setRecordingElapsed(0)
      setIsRecording(true)

      // Contador de tempo gravado
      recordingIntervalRef.current = setInterval(() => {
        setRecordingElapsed(s => s + 1)
      }, 1000)

      // Limite anti-abuso: 90 segundos
      maxRecordingTimerRef.current = setTimeout(() => {
        handleStopRecording()
      }, MAX_RECORDING_SECONDS * 1000)
    } catch {
      // permissão negada ou dispositivo indisponível
    }
  }

  function handleStopRecording() {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    if (maxRecordingTimerRef.current) {
      clearTimeout(maxRecordingTimerRef.current)
      maxRecordingTimerRef.current = null
    }
    recorderRef.current?.stop()
    recorderRef.current = null
    // Mantém isRecording=true até o FileReader terminar (evita flash do estado normal)
    setIsProcessingAudio(true)
  }

  function handleSendAudio() {
    if (!pendingAudio) return
    void submit("audio", pendingAudio.base64, pendingAudio.mimeType)
    setPendingAudio(null)
  }

  function handleDiscardAudio() {
    setPendingAudio(null)
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !audioPlayer.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = fraction * audioPlayer.duration
    setAudioPlayer(s => ({ ...s, currentTime: audio.currentTime }))
  }

  return (
    <main className="h-dvh max-w-2xl mx-auto flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="px-4 pt-5 pb-3.5 flex-shrink-0 flex items-center justify-between border-b border-border bg-background z-10">
        <div>
          <h1 className="text-xl font-extrabold leading-tight tracking-tight">MyNutri</h1>
          <p className="text-xs text-muted-foreground leading-tight">Assistente de escolhas nutricionais</p>
        </div>
        
        <div className="flex items-center gap-3">
          {userProfile && (
            <button
              onClick={() => setHistoryOpen(true)}
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Ver histórico"
            >
              <History size={18} />
            </button>
          )}

          <div className="relative">
            {userProfile ? (
              <>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  {userProfile.name?.[0]?.toUpperCase() || userProfile.email[0].toUpperCase()}
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl border border-border shadow-lg z-50 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm font-medium truncate">
                            {userProfile.name || "Usuário"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {userProfile.email}
                          </p>
                          {userProfile.expertName && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              Expert: {userProfile.expertName}
                            </div>
                          )}
                        </div>
                        <div className="p-1">
                          {userProfile.hasPanel && (
                            <Link
                              href="/painel"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors flex items-center gap-2"
                              onClick={() => setMenuOpen(false)}
                            >
                              <LayoutDashboard size={16} className="text-muted-foreground" /> Acessar painel
                            </Link>
                          )}
                          {userProfile.isSudo && (
                            <Link
                              href="/sudo"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors flex items-center gap-2"
                              onClick={() => setMenuOpen(false)}
                            >
                              <ShieldCheck size={16} className="text-muted-foreground" /> Sudo
                            </Link>
                          )}
                          <button
                            onClick={() => {
                              setMenuOpen(false)
                              handleLogout()
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <LogOut size={16} /> Sair
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <Link
                href="/auth"
                className="text-sm font-medium px-4 py-2.5 rounded-xl bg-secondary border border-border hover:bg-secondary/80 transition-colors"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Drawer Histórico (estilo ChatGPT mobile) */}
      <AnimatePresence>
        {historyOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setHistoryOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-card border-r border-border z-50 flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">Histórico de Sessões</h2>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="p-2 -mr-2 rounded-full hover:bg-muted text-muted-foreground"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4">
                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  <MessageSquare size={16} />
                  Nova conversa
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-4">
                {loadingHistory ? (
                  <div className="flex flex-col gap-2 p-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : sessionsList.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {sessionsList.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => loadSession(s.id)}
                        className={`text-left px-3 py-3 rounded-lg text-sm transition-colors ${s.id === sessionId ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                      >
                        <div className="truncate">{s.title || "Nova Conversa"}</div>
                        <div className="text-xs opacity-60 mt-1">
                          {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhuma conversa anterior.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Histórico / Estado vazio */}
      <section className="flex-1 overflow-y-auto px-4 py-3 flex flex-col">
        <AnimatePresence mode="wait">
          {loginGated ? (
            <LoginGateScreen key="login-gate" />
          ) : paywalled ? (
            <PaywallScreen key="paywall" />
          ) : isEmpty && !loading ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col items-center justify-center px-8"
            >
              <div className="flex flex-col gap-3 w-full max-w-sm">
                {/* Linha 1: câmera + áudio — altura fixa, sempre visível */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCameraCapture}
                    disabled={isRecording || isProcessingAudio || !!pendingAudio}
                    className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-secondary border border-border text-secondary-foreground text-sm font-medium hover:bg-secondary/80 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-secondary"
                  >
                    <CameraIcon className="opacity-70 flex-shrink-0" />
                    Imagem
                  </button>
                  <button
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    disabled={isProcessingAudio || !!pendingAudio}
                    className={`flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl border text-sm font-medium active:scale-[0.97] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isRecording
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : "bg-secondary border-border text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {isRecording ? (
                      <><StopIcon className="flex-shrink-0" />{formatAudioTime(recordingElapsed)}</>
                    ) : (
                      <><MicIcon className="opacity-70 flex-shrink-0" />Áudio</>
                    )}
                  </button>
                </div>

                {/* Linha 2: player de áudio (quando pendingAudio) ou input de texto */}
                {pendingAudio ? (
                  <div className="flex items-center border border-border rounded-xl bg-card pl-1 pr-1.5 h-[46px]">
                    <button
                      type="button"
                      onClick={handleDiscardAudio}
                      aria-label="Descartar áudio"
                      className="w-8 h-8 flex items-center justify-center rounded-full text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0 ml-0.5 cursor-pointer"
                    >
                      <Trash size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={handleTogglePlayback}
                      aria-label={audioPlayer.isPlaying ? "Pausar" : "Reproduzir"}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex-shrink-0 ml-1 cursor-pointer"
                    >
                      {audioPlayer.isPlaying ? <Pause size={13} /> : <Play size={13} className="translate-x-px" />}
                    </button>
                    <div
                      className="flex-1 relative h-1.5 bg-muted rounded-full overflow-hidden mx-3 cursor-pointer"
                      onClick={handleSeek}
                    >
                      <div
                        className="absolute left-0 top-0 h-full bg-primary rounded-full transition-none"
                        style={{ width: `${audioPlayer.duration > 0 ? (audioPlayer.currentTime / audioPlayer.duration) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0 w-8 text-right mr-1">
                      {formatAudioTime(audioPlayer.isPlaying ? audioPlayer.currentTime : audioPlayer.duration)}
                    </span>
                    <button
                      type="button"
                      onClick={handleSendAudio}
                      aria-label="Enviar áudio"
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleText}
                    className="flex items-center border border-border rounded-xl bg-card px-4 pr-1.5 h-[46px] focus-within:ring-2 focus-within:ring-ring/40 transition-shadow"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={isRecording ? "" : inputText}
                      onChange={(e) => { if (!isRecording) setInputText(e.target.value) }}
                      placeholder={isRecording ? "Gravando áudio..." : "Escreva sua dúvida..."}
                      disabled={loading || isRecording}
                      className="flex-1 text-sm bg-transparent focus:outline-none disabled:opacity-50 min-w-0 placeholder:text-muted-foreground"
                    />
                    {isRecording ? (
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        aria-label="Parar gravação"
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-destructive text-white flex-shrink-0 hover:opacity-90 cursor-pointer transition-opacity"
                      >
                        <StopIcon />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading || !inputText.trim()}
                        aria-label="Enviar mensagem"
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity flex-shrink-0 hover:opacity-90 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
                        </svg>
                      </button>
                    )}
                  </form>
                )}
              </div>
            </motion.div>
          ) : isEmpty ? (
            <motion.div
              key="loading-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center gap-1.5"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/60 block"
                  animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                />
              ))}
            </motion.div>
          ) : (
            <SessionHistory
              key="history"
              session={session}
              onCorrectType={(i, t) => void handleCorrectType(i, t)}
              disabled={loading}
            />
          )}
        </AnimatePresence>

        {/* Loading (histórico) */}
        <AnimatePresence>
          {!isEmpty && loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 px-1 py-3"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/60 block"
                  animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Erro */}
        <AnimatePresence>
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 mt-2"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {/* Pill de input (só quando há histórico) */}
      <AnimatePresence>
      {!isEmpty && (
      <motion.section
        key="bottom-input"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex-shrink-0 border-t border-border px-4 py-3 bg-background z-10 relative"
      >
        <form
          onSubmit={handleText}
          className="flex items-center border border-border rounded-full bg-card pl-1 pr-1 focus-within:ring-2 focus-within:ring-ring/40 transition-shadow"
        >
          {/* Botões à esquerda: câmera + mic/trash */}
          <button
            type="button"
            onClick={handleCameraCapture}
            disabled={loading || isRecording || !!pendingAudio}
            aria-label="Adicionar imagem"
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors flex-shrink-0 my-0.5 ml-0.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <CameraIcon />
          </button>
          <button
            type="button"
            onClick={pendingAudio ? handleDiscardAudio : handleStartRecording}
            disabled={loading || isRecording}
            aria-label={pendingAudio ? "Descartar áudio" : "Gravar áudio"}
            className={`w-8 h-8 flex items-center justify-center rounded-full disabled:opacity-40 transition-colors flex-shrink-0 my-0.5 cursor-pointer disabled:cursor-not-allowed ${
              pendingAudio
                ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {pendingAudio ? <Trash size={16} /> : <MicIcon />}
          </button>

          {/* Campo de texto / player de áudio */}
          {pendingAudio ? (
            <div className="flex-1 flex items-center gap-2 px-2 py-2">
              <button
                type="button"
                onClick={handleTogglePlayback}
                aria-label={audioPlayer.isPlaying ? "Pausar" : "Reproduzir"}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex-shrink-0 cursor-pointer"
              >
                {audioPlayer.isPlaying ? <Pause size={13} /> : <Play size={13} className="translate-x-px" />}
              </button>
              <div className="flex-1 relative h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer" onClick={handleSeek}>
                <div
                  className="absolute left-0 top-0 h-full bg-primary rounded-full transition-none"
                  style={{ width: `${audioPlayer.duration > 0 ? (audioPlayer.currentTime / audioPlayer.duration) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0 w-8 text-right">
                {formatAudioTime(audioPlayer.isPlaying ? audioPlayer.currentTime : audioPlayer.duration)}
              </span>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={isRecording ? "" : inputText}
              onChange={(e) => { if (!isRecording) setInputText(e.target.value) }}
              placeholder={isRecording ? "Gravando áudio..." : "Escreva sua dúvida..."}
              disabled={loading || isRecording}
              className="flex-1 py-2.5 px-2 text-sm bg-transparent focus:outline-none disabled:opacity-50 min-w-0 placeholder:text-muted-foreground"
            />
          )}

          {/* Botão direito: enviar / parar gravação */}
          {isRecording ? (
            <button
              type="button"
              onClick={handleStopRecording}
              aria-label="Parar gravação"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-destructive text-white flex-shrink-0 my-0.5 mr-0.5 hover:opacity-90 cursor-pointer transition-opacity"
            >
              <StopIcon />
            </button>
          ) : pendingAudio ? (
            <button
              type="button"
              onClick={handleSendAudio}
              aria-label="Enviar áudio"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0 my-0.5 mr-0.5 hover:opacity-90 cursor-pointer transition-opacity"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22 11 13 2 9l20-7z" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              aria-label="Enviar mensagem"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity flex-shrink-0 my-0.5 mr-0.5 hover:opacity-90 cursor-pointer disabled:cursor-not-allowed"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22 11 13 2 9l20-7z" />
              </svg>
            </button>
          )}
        </form>
      </motion.section>
      )}
      </AnimatePresence>
    </main>
  )
}
