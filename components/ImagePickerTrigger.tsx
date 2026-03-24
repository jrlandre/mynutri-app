'use client'

import React, { useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { compressImage } from '@/lib/compress-image'
import { validateImageFile } from '@/lib/validateImageFile'
import { readCapabilityCache, saveCapabilityCache } from '@/lib/imagePickerCapability'
import { probeNativePicker } from '@/lib/nativePickerProbe'

interface Props {
  onImageSelected: (base64: string, mimeType: string) => void
  onError?: (msg: string) => void
  children: React.ReactElement
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function GalleryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

export function ImagePickerTrigger({ onImageSelected, onError, children }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [webcamOpen, setWebcamOpen] = useState(false)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const [isFrontCamera, setIsFrontCamera] = useState(false)
  const [isStartingCamera, setIsStartingCamera] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const webcamStreamRef = useRef<MediaStream | null>(null)
  const webcamVideoNodeRef = useRef<HTMLVideoElement | null>(null)
  const isRequestingCamera = useRef(false)

  const webcamVideoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    webcamVideoNodeRef.current = node
    if (node && webcamStreamRef.current) {
      node.srcObject = webcamStreamRef.current
      node.play().catch(() => {})
    }
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const validation = await validateImageFile(file)
    if (!validation.valid) {
      onError?.(validation.error ?? 'Imagem inválida.')
      return
    }
    try {
      const base64 = await compressImage(file)
      onImageSelected(base64, 'image/jpeg')
    } catch {
      onError?.('Não foi possível processar a imagem. Tente outra.')
    }
  }

  async function probeAndPickOrFallback() {
    const input = fileInputRef.current
    if (!input) { setSheetOpen(true); return }
    const opened = await probeNativePicker(input, 800)
    if (opened) {
      saveCapabilityCache('native')
      // onChange do input disparará quando o usuário selecionar o arquivo
    } else {
      saveCapabilityCache('custom')
      setSheetOpen(true)
    }
  }

  function handleTriggerClick() {
    const cached = readCapabilityCache()
    if (cached === 'native') {
      fileInputRef.current?.click()
    } else if (cached === 'custom') {
      setSheetOpen(true)
    } else {
      void probeAndPickOrFallback()
    }
  }

  function handleSheetGallery() {
    setSheetOpen(false)
    fileInputRef.current?.click()
  }

  async function handleOpenWebcam() {
    if (isRequestingCamera.current) return
    isRequestingCamera.current = true
    setSheetOpen(false)
    setIsStartingCamera(true)
    setWebcamError(null)
    webcamStreamRef.current?.getTracks().forEach(t => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      webcamStreamRef.current = stream
      const settings = stream.getVideoTracks()[0]?.getSettings()
      setIsFrontCamera(settings?.facingMode === 'user')
      setWebcamOpen(true)
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotAllowedError') setWebcamError('Permissão de câmera negada.')
      else if (name === 'NotFoundError') setWebcamError('Nenhuma câmera encontrada.')
      else if (name === 'NotReadableError') setWebcamError('Câmera em uso por outro app.')
      else setWebcamError('Não foi possível acessar a câmera.')
      setWebcamOpen(true)
    } finally {
      isRequestingCamera.current = false
      setIsStartingCamera(false)
    }
  }

  function handleCloseWebcam() {
    webcamStreamRef.current?.getTracks().forEach(t => t.stop())
    webcamStreamRef.current = null
    setWebcamOpen(false)
    setWebcamError(null)
    setIsFrontCamera(false)
    setIsStartingCamera(false)
  }

  function handleWebcamCapture() {
    const video = webcamVideoNodeRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (isFrontCamera) {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
    handleCloseWebcam()
    onImageSelected(base64, 'image/jpeg')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trigger = React.cloneElement(children as React.ReactElement<any>, { onClick: handleTriggerClick })

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {trigger}

      {/* Bottom sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              key="img-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              key="img-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl bg-background rounded-t-2xl shadow-xl"
            >
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-3 mb-2" />
              <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-6">Adicionar imagem</p>
              <div className="flex flex-col px-4 pb-8 gap-2">
                <button
                  onClick={() => void handleOpenWebcam()}
                  disabled={isStartingCamera}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-secondary hover:bg-secondary/80 active:scale-[0.98] transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <CameraIcon />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Câmera</div>
                    <div className="text-xs text-muted-foreground">
                      {isStartingCamera ? 'Iniciando câmera…' : 'Tirar uma foto agora'}
                    </div>
                  </div>
                </button>
                <button
                  onClick={handleSheetGallery}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-secondary hover:bg-secondary/80 active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <GalleryIcon />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Galeria / Arquivos</div>
                    <div className="text-xs text-muted-foreground">Escolher do dispositivo</div>
                  </div>
                </button>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="text-sm text-muted-foreground py-3 hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Webcam overlay */}
      <AnimatePresence>
        {webcamOpen && (
          <motion.div
            key="webcam-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-6"
          >
            {webcamError ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-white/80 text-sm">{webcamError}</p>
                <button
                  onClick={handleCloseWebcam}
                  className="px-6 py-3 rounded-xl bg-white text-black text-sm font-semibold"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={webcamVideoCallbackRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-w-2xl max-h-[70dvh] rounded-xl"
                  style={{ objectFit: 'contain', transform: isFrontCamera ? 'scaleX(-1)' : 'none' }}
                />
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleCloseWebcam}
                    className="px-6 py-3 rounded-xl border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleWebcamCapture}
                    className="px-6 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-[0.97] transition-all"
                  >
                    Tirar foto
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
