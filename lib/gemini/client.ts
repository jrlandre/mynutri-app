import { GoogleGenAI } from "@google/genai"

if (!process.env.GOOGLE_AI_API_KEY) {
  throw new Error("GOOGLE_AI_API_KEY não definida nas variáveis de ambiente")
}

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })

export { ai }
