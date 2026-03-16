const MAX_SIDE = 1920
const JPEG_QUALITY = 0.92

export function compressImage(file: File): Promise<string> {
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
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY).replace(/^data:image\/jpeg;base64,/, ""))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
