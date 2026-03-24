const MAX_SIZE_BYTES = 20 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

interface ValidationResult { valid: boolean; error?: string; file?: File }

export async function validateImageFile(file: File): Promise<ValidationResult> {
  if (!ACCEPTED_TYPES.has(file.type))
    return { valid: false, error: 'Tipo não suportado. Use JPEG, PNG ou WebP.' }
  if (file.size > MAX_SIZE_BYTES)
    return { valid: false, error: 'Imagem muito grande. Máximo: 20 MB.' }
  try {
    await new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => { URL.revokeObjectURL(url); resolve() }
      img.onerror = () => { URL.revokeObjectURL(url); reject() }
      img.src = url
    })
  } catch {
    return { valid: false, error: 'Não foi possível ler esta imagem. Ela pode estar corrompida.' }
  }
  return { valid: true, file }
}
