"use client"

import { useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { AnalysisResult, InputType, ConfidenceLevel } from "@/types"

interface ResultCardProps {
  result: AnalysisResult
  analysisIndex: number
  onCorrectType: (index: number, type: InputType) => void
  disabled?: boolean
}

const typeConfig: Record<InputType, { icon: string; label: string; accent: string }> = {
  produce:      { icon: "🌿", label: "Alimento",  accent: "border-l-green-500"  },
  label:        { icon: "🏷️", label: "Rótulo",    accent: "border-l-amber-500"  },
  conversation: { icon: "💬", label: "Conversa",  accent: "border-l-blue-400"   },
}

const confidenceStyle: Record<ConfidenceLevel, string> = {
  Alta:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Média: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Baixa: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const confidenceLabel: Record<ConfidenceLevel, string> = {
  Alta:  "Confiança alta",
  Média: "Confiança média",
  Baixa: "Confiança baixa",
}

const INPUT_TYPE_OPTIONS: InputType[] = ["produce", "label", "conversation"]

export default function ResultCard({ result, analysisIndex, onCorrectType, disabled }: ResultCardProps) {
  const [selectedType, setSelectedType] = useState<InputType>(result.inputType)

  function handleTypeChange(newType: InputType) {
    setSelectedType(newType)
    onCorrectType(analysisIndex, newType)
  }

  const config = typeConfig[selectedType]

  const cleanedRaw = result.raw
    .replace(/\*{0,2}CONFIANÇA:\*{0,2}[\s*]*(Alta|Média|Baixa)[^\n]*/gi, "")
    .trim()

  return (
    <div className={`rounded-lg border border-border border-l-4 ${config.accent} bg-card p-4 flex flex-col gap-3 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-base">{config.icon}</span>
        <select
          value={selectedType}
          disabled={disabled}
          onChange={(e) => {
            handleTypeChange(e.target.value as InputType)
            e.currentTarget.blur()
          }}
          onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur() }}
          className="text-xs font-medium border border-border rounded-md px-2 py-0.5 bg-background cursor-pointer [outline:none] focus:ring-0 disabled:opacity-50 hover:bg-muted transition-colors"
        >
          {INPUT_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {typeConfig[t].label}
            </option>
          ))}
        </select>

        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${confidenceStyle[result.confidence]}`}>
          {confidenceLabel[result.confidence]}
        </span>

        {result.confidenceReason && (
          <span className="text-xs text-muted-foreground w-full">{result.confidenceReason}</span>
        )}
      </div>

      {/* Conteúdo markdown */}
      <div className="prose text-sm text-foreground">
        <Markdown remarkPlugins={[remarkGfm]}>
          {cleanedRaw}
        </Markdown>
      </div>
    </div>
  )
}
