"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const AUTO_CLOSE_MS = 6_000

interface Props {
  content: React.ReactNode
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
}

const sideStyles: Record<NonNullable<Props["side"]>, string> = {
  top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left:   "right-full top-1/2 -translate-y-1/2 mr-2",
  right:  "left-full top-1/2 -translate-y-1/2 ml-2",
}

const sideMotion: Record<NonNullable<Props["side"]>, { y?: number; x?: number }> = {
  top:    { y: 4 },
  bottom: { y: -4 },
  left:   { x: 4 },
  right:  { x: -4 },
}

const arrowStyles: Record<NonNullable<Props["side"]>, string> = {
  top:    "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-foreground",
  bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-foreground",
  left:   "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-foreground",
  right:  "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-foreground",
}

export function Tooltip({ content, children, side = "top" }: Props) {
  const [open, setOpen] = useState(false)
  const manualTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLSpanElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false)
        if (manualTimer.current) { clearTimeout(manualTimer.current); manualTimer.current = null }
      }
    }
    document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [open])

  function onMouseEnter() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setOpen(true)
  }

  function onMouseLeave() {
    hoverTimer.current = setTimeout(() => setOpen(false), 100)
  }

  function onClick(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(true)
    if (manualTimer.current) clearTimeout(manualTimer.current)
    manualTimer.current = setTimeout(() => {
      setOpen(false)
      manualTimer.current = null
    }, AUTO_CLOSE_MS)
  }

  const { y = 0, x = 0 } = sideMotion[side]

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex items-center"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {children}

      <AnimatePresence>
        {open && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, scale: 0.92, y, x }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, y, x }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`pointer-events-none absolute z-50 w-max max-w-[220px] ${sideStyles[side]}`}
          >
            <div className="rounded-lg bg-foreground px-3 py-2 text-[11px] leading-relaxed text-background shadow-md">
              {content}
            </div>
            {/* Arrow */}
            <span className={`absolute border-4 ${arrowStyles[side]}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
