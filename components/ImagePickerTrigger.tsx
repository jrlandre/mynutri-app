'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { compressImage } from '@/lib/compress-image'
import { validateImageFile } from '@/lib/validateImageFile'
import { usePickerStrategy } from '@/hooks/usePickerStrategy'

declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      types?: Array<{ description: string; accept: Record<string, string[]> }>
      multiple?: boolean
      excludeAcceptAllOption?: boolean
    }) => Promise<FileSystemFileHandle[]>
  }
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
}

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
  const strategy = usePickerStrategy()
  
  const [sheetOpen, setSheetOpen] = useState(false)
  const [webcamOpen, setWebcamOpen] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)
  
  const [isFrontCamera, setIsFrontCamera] = useState(false)
  const [isStartingCamera, setIsStartingCamera] = useState(false)

  const iosInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)
  
  // A11y: ref para devolver o foco após o dialog fechar
  const triggerRef = useRef<HTMLElement>(null)
  
  const webcamStreamRef = useRef<MediaStream | null>(null)
  const webcamVideoNodeRef = useRef<HTMLVideoElement | null>(null)
  const isRequestingCamera = useRef(false)
  
  // Anti Race-condition: evita vazamento de stream se desmontar durante getUserMedia
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      webcamStreamRef.current?.getTracks().forEach(track => track.stop())
    }
  }, [])

  const webcamVideoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    webcamVideoNodeRef.current = node
    if (node && webcamStreamRef.current) {
      node.srcObject = webcamStreamRef.current
      node.play().catch(() => {})
    }
  }, [])

  function closeSheet() {
    setSheetOpen(false)
    // Devolve o foco ao botão original (A11y)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  async function processFile(file: File) {
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

  async function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' 
    if (!file) return
    closeSheet()
    
    try {
      await processFile(file)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Falha inesperada ao processar imagem.')
    }
  }

  function handleTriggerClick() {
    if (strategy === 'RESOLVING') return 

    if (strategy === 'IOS') {
      iosInputRef.current?.click()
    } else {
      setMenuError(null)
      setSheetOpen(true)
    }
  }

  async function handleSheetCamera() {
    if (strategy === 'ANDROID') {
      closeSheet()
      cameraInputRef.current?.click()
    } else {
      await openWebcam()
    }
  }

  async function handleSheetFiles() {
    // Garantido rodar no client via onClick
    if ('showOpenFilePicker' in window) {
      try {
        const fileHandles = await window.showOpenFilePicker!({
          types: [{ description: 'Imagens', accept: { 'image/*': [] } }],
          multiple: false, excludeAcceptAllOption: true
        })
        const file = await fileHandles[0].getFile()
        closeSheet()
        try {
          await processFile(file)
        } catch (err) {
          onError?.(err instanceof Error ? err.message : 'Falha ao processar imagem.')
        }
        return
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.warn('[ImagePicker] showOpenFilePicker falhou, caindo para fallback:', err)
      }
    }
    
    closeSheet()
    filesInputRef.current?.click()
  }

  async function openWebcam() {
    if (isRequestingCamera.current) return
    isRequestingCamera.current = true
    setIsStartingCamera(true)
    
    webcamStreamRef.current?.getTracks().forEach(t => t.stop())
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      
      // Se o componente foi desmontado enquanto o usuário aceitava a permissão, para o stream e sai
      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop())
        return
      }

      webcamStreamRef.current = stream
      const settings = stream.getVideoTracks()[0]?.getSettings()
      setIsFrontCamera(settings?.facingMode === 'user')
      
      setSheetOpen(false)
      setWebcamOpen(true)
    } catch (err) {
      if (!mountedRef.current) return
      
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotFoundError') {
        setMenuError('Nenhuma câmera conectada.')
      } else if (name === 'NotAllowedError') {
        setMenuError('Permissão de câmera negada.')
      } else if (name === 'NotReadableError') {
        setMenuError('A câmera já está em uso por outro aplicativo.')
      } else {
        setMenuError('Erro desconhecido ao acessar a câmera.')
      }
    } finally {
      isRequestingCamera.current = false
      if (mountedRef.current) setIsStartingCamera(false)
    }
  }

  function handleCloseWebcam() {
    webcamStreamRef.current?.getTracks().forEach(t => t.stop())
    webcamStreamRef.current = null
    setWebcamOpen(false)
    setIsFrontCamera(false)
    setIsStartingCamera(false)
    // Devolve o foco também quando fecha a câmera
    requestAnimationFrame(() => triggerRef.current?.focus())
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

  const trigger = React.cloneElement(
    React.Children.only(children) as React.ReactElement<{
      onClick?: React.MouseEventHandler<HTMLElement>
      ref?: React.Ref<HTMLElement>
      'aria-haspopup'?: boolean | 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid'
      'aria-expanded'?: boolean
    }>,
    { 
      onClick: handleTriggerClick,
      ref: triggerRef,
      ...(strategy !== 'IOS' && strategy !== 'RESOLVING' && {
        'aria-haspopup': 'dialog',
        'aria-expanded': sheetOpen,
      })
    }
  )

  return (
    <>
      {strategy === 'IOS' && (
        <input ref={iosInputRef} type="file" accept="image/*" aria-hidden="true" style={{ display: 'none' }} onChange={handleFileInputChange} />
      )}

      {strategy === 'ANDROID' && (
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" aria-hidden="true" style={{ display: 'none' }} onChange={handleFileInputChange} />
      )}

      {(strategy === 'ANDROID' || strategy === 'DESKTOP') && (
        <input ref={filesInputRef} type="file" accept="image/*, .heic, .heif, .avif" aria-hidden="true" style={{ display: 'none' }} onChange={handleFileInputChange} />
      )}
      
      {trigger}

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div key="img-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={closeSheet} className="fixed inset-0 bg-black/40 z-50" />
            <motion.div key="img-sheet" role="dialog" aria-modal="true" aria-label="Opções de envio de imagem" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }} className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl bg-background rounded-t-2xl shadow-xl">
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-3 mb-2" />
              <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-6">Adicionar imagem</p>
              
              <div className="flex flex-col px-4 pb-8 gap-2">
                {menuError && (
                  <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl mb-2 flex items-center justify-between">
                    <span>{menuError}</span>
                  </div>
                )}

                <button
                  onClick={() => void handleSheetCamera()}
                  disabled={isStartingCamera}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-secondary hover:bg-secondary/80 active:scale-[0.98] transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <CameraIcon />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Câmera</div>
                    <div className="text-xs text-muted-foreground">
                      Tirar uma foto agora
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => void handleSheetFiles()}
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
                  onClick={closeSheet}
                  className="text-sm text-muted-foreground py-3 hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {webcamOpen && (
          <motion.div key="webcam-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-6">
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
