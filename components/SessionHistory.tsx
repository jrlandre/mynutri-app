"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import ChatBubble from "./ChatBubble"
import ResultCard from "./ResultCard"
import type { SessionState, InputType } from "@/types"

interface SessionHistoryProps {
  session: SessionState
  onCorrectType: (index: number, type: InputType) => void
  disabled?: boolean
}

export default function SessionHistory({ session, onCorrectType, disabled }: SessionHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [session.analyses.length])

  return (
    <div className="flex-1 flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {session.analyses.map((result, i) => {
          const userMsg = session.messages[i * 2]
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              layout
              className="flex flex-col gap-2"
            >
              {userMsg && <ChatBubble message={userMsg} />}
              <ResultCard
                result={result}
                analysisIndex={i}
                onCorrectType={onCorrectType}
                disabled={disabled}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  )
}
