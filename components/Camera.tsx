"use client"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

interface CameraProps {
  onCapture: (base64: string, mimeType: "image/jpeg") => void
  disabled?: boolean
}

const MAX_SIDE = 1920
const JPEG_QUALITY = 0.92

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ratio = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("Canvas context unavailable"))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY)
        // remove o prefixo data:image/jpeg;base64,
        resolve(dataUrl.replace(/^data:image\/jpeg;base64,/, ""))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Camera({ onCapture, disabled }: CameraProps) {
  function handleClick() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const base64 = await compressImage(file)
        onCapture(base64, "image/jpeg")
      } catch {
        // silenciosamente ignora
      }
    }
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(buttonVariants({ variant: "outline" }))}
    >
      📷 Foto
    </button>
  )
}
