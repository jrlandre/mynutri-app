"use client"

import { useState, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { LogOut, LayoutDashboard } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import SessionHistory from "@/components/SessionHistory"
import PaywallScreen from "@/components/PaywallScreen"
import LoginGateScreen from "@/components/LoginGateScreen"
import { compressImage } from "@/lib/compress-image"
import type { SessionState, AnalysisResult, InputType, UserProfile } from "@/types"

interface Props {
  tenantSubdomain?: string
  userProfile?: UserProfile | null
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
  const [loading, setLoading] = useState(false)
  const [inputText, setInputText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [paywalled, setPaywalled] = useState(false)
  const [loginGated, setLoginGated] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const isEmpty = session.analyses.length === 0

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
      const { result, updatedMessages } = await res.json() as {
        result: AnalysisResult
        updatedMessages: typeof session.messages
      }
      setSession((prev) => ({
        messages: updatedMessages,
        analyses: [...prev.analyses, result],
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
      const { result, updatedMessages } = await res.json() as {
        result: AnalysisResult
        updatedMessages: typeof session.messages
      }
      result.inputType = newType
      setSession((prev) => {
        const analyses = prev.analyses.map((a, i) => (i === index ? result : a))
        const messages = [
          ...previousMessages,
          ...updatedMessages.slice(previousMessages.length),
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
    input.capture = "environment"
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
          void submit("audio", base64, mimeType)
        }
        reader.readAsDataURL(blob)
      }

      recorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch {
      // permissão negada ou dispositivo indisponível
    }
  }

  function handleStopRecording() {
    recorderRef.current?.stop()
    recorderRef.current = null
    setIsRecording(false)
  }

  return (
    <main className="h-dvh max-w-2xl mx-auto flex flex-col">
      {/* Header */}
      <header className="px-4 pt-5 pb-3.5 flex-shrink-0 flex items-center justify-between border-b border-border">
        <div>
          <h1 className="text-xl font-extrabold leading-tight tracking-tight">MyNutri</h1>
          <p className="text-xs text-muted-foreground leading-tight">Assistente de escolhas nutricionais</p>
        </div>
        
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
                        {userProfile.nutritionistName && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Nutri: {userProfile.nutritionistName}
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
      </header>

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
              <div className="flex flex-col gap-5 w-full max-w-sm">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCameraCapture}
                    className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-secondary border border-border text-secondary-foreground text-sm font-medium hover:bg-secondary/80 active:scale-[0.97] transition-all cursor-pointer"
                  >
                    <CameraIcon className="opacity-70 flex-shrink-0" />
                    Imagem
                  </button>
                  <button
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={`flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl border text-sm font-medium active:scale-[0.97] transition-all cursor-pointer ${
                      isRecording
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : "bg-secondary border-border text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {isRecording ? (
                      <><StopIcon className="flex-shrink-0" />Parar gravação</>
                    ) : (
                      <><MicIcon className="opacity-70 flex-shrink-0" />Áudio</>
                    )}
                  </button>
                </div>

                <form
                  onSubmit={handleText}
                  className="flex items-center border border-border rounded-xl bg-card px-4 pr-1.5 focus-within:ring-2 focus-within:ring-ring/40 transition-shadow"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={isRecording ? "" : inputText}
                    onChange={(e) => { if (!isRecording) setInputText(e.target.value) }}
                    placeholder={isRecording ? "Gravando áudio..." : "Escreva sua dúvida..."}
                    disabled={loading || isRecording}
                    className="flex-1 py-3 text-sm bg-transparent focus:outline-none disabled:opacity-50 min-w-0 placeholder:text-muted-foreground"
                  />
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      aria-label="Parar gravação"
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-destructive text-white flex-shrink-0 my-1 hover:opacity-90 cursor-pointer transition-opacity"
                    >
                      <StopIcon />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading || !inputText.trim()}
                      aria-label="Enviar mensagem"
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity flex-shrink-0 my-1 hover:opacity-90 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M22 2L11 13" />
                        <path d="M22 2L15 22 11 13 2 9l20-7z" />
                      </svg>
                    </button>
                  )}
                </form>
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
        className="flex-shrink-0 border-t border-border px-4 py-3 bg-background"
      >
        <form
          onSubmit={handleText}
          className="flex items-center border border-border rounded-full bg-card pl-1 pr-1 focus-within:ring-2 focus-within:ring-ring/40 transition-shadow"
        >
          {/* Botões à esquerda: câmera + mic */}
          <button
            type="button"
            onClick={handleCameraCapture}
            disabled={loading || isRecording}
            aria-label="Fotografar alimento"
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors flex-shrink-0 my-0.5 ml-0.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <CameraIcon />
          </button>
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={loading || isRecording}
            aria-label="Gravar áudio"
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors flex-shrink-0 my-0.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <MicIcon />
          </button>

          {/* Campo de texto */}
          <input
            ref={inputRef}
            type="text"
            value={isRecording ? "" : inputText}
            onChange={(e) => { if (!isRecording) setInputText(e.target.value) }}
            placeholder={isRecording ? "Gravando áudio..." : "Escreva sua dúvida..."}
            disabled={loading || isRecording}
            className="flex-1 py-2.5 px-2 text-sm bg-transparent focus:outline-none disabled:opacity-50 min-w-0 placeholder:text-muted-foreground"
          />

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
