"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"

interface AudioRecorderProps {
  onCapture: (base64: string, mimeType: string) => void
  disabled?: boolean
}

type RecordingState = "idle" | "recording"

export default function AudioRecorder({ onCapture, disabled }: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle")
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
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
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string
          const [prefix, base64] = dataUrl.split(",")
          const mimeType = prefix.replace("data:", "").replace(";base64", "")
          onCapture(base64, mimeType)
        }
        reader.readAsDataURL(blob)
      }

      recorderRef.current = recorder
      recorder.start()
      setState("recording")
    } catch {
      // permissão negada ou dispositivo indisponível — não faz nada
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    recorderRef.current = null
    setState("idle")
  }

  if (state === "recording") {
    return (
      <Button type="button" variant="destructive" onClick={stopRecording}>
        ⏹ Parar
      </Button>
    )
  }

  return (
    <Button type="button" variant="outline" disabled={disabled} onClick={startRecording}>
      🎤 Áudio
    </Button>
  )
}
