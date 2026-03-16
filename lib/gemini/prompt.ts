import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadSystemPrompt(): string {
  if (process.env.MYNUTRI_SYSTEM_PROMPT) {
    return process.env.MYNUTRI_SYSTEM_PROMPT.replace(/\\n/g, "\n")
  }

  // Fallback local: lê direto do mynutri-core em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    try {
      const filePath = resolve(process.cwd(), '../mynutri-core/prompts/base.txt')
      return readFileSync(filePath, 'utf-8')
    } catch {
      // mynutri-core não encontrado — continua sem prompt
    }
  }

  return ""
}

export const SYSTEM_PROMPT = loadSystemPrompt()
