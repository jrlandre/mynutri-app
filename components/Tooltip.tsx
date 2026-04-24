"use client"

import { useState, useRef, useEffect, useCallback } from "react"
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
  const [isHovering, setIsHovering]       = useState(false)
  const [isFocused,  setIsFocused]        = useState(false)
  const [isManualOpen, setIsManualOpen]   = useState(false)

  const isOpen = isHovering || isFocused || isManualOpen

  const triggerRef  = useRef<HTMLButtonElement>(null)
  const contentRef  = useRef<HTMLDivElement>(null)
  const hoverTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const manualTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearManualTimer = useCallback(() => {
    if (manualTimer.current) { clearTimeout(manualTimer.current); manualTimer.current = null }
  }, [])

  // Outside-click: close manual open, but NOT when clicking the trigger itself
  useEffect(() => {
    if (!isManualOpen) return
    function onDocClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return
      if (contentRef.current?.contains(e.target as Node)) return
      setIsManualOpen(false)
      clearManualTimer()
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [isManualOpen, clearManualTimer])

  // Cleanup on unmount
  useEffect(() => () => {
    if (hoverTimer.current)  clearTimeout(hoverTimer.current)
    if (manualTimer.current) clearTimeout(manualTimer.current)
  }, [])

  function onTriggerMouseEnter() {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null }
    setIsHovering(true)
  }

  function onTriggerMouseLeave() {
    hoverTimer.current = setTimeout(() => setIsHovering(false), 100)
  }

  function onContentMouseEnter() {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null }
    setIsHovering(true)
  }

  function onContentMouseLeave() {
    hoverTimer.current = setTimeout(() => setIsHovering(false), 100)
  }

  function onFocus() { setIsFocused(true) }
  function onBlur()  { setIsFocused(false) }

  function onClick(e: React.MouseEvent) {
    e.stopPropagation()
    triggerRef.current?.blur()
    setIsFocused(false)

    if (isManualOpen) {
      setIsManualOpen(false)
      clearManualTimer()
      return
    }

    setIsManualOpen(true)
    clearManualTimer()
    manualTimer.current = setTimeout(() => {
      setIsManualOpen(false)
      manualTimer.current = null
    }, AUTO_CLOSE_MS)
  }

  const { y = 0, x = 0 } = sideMotion[side]

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center cursor-default focus:outline-none"
        onMouseEnter={onTriggerMouseEnter}
        onMouseLeave={onTriggerMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
        aria-describedby={isOpen ? "tooltip-content" : undefined}
      >
        {children}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="tooltip-content"
            role="tooltip"
            ref={contentRef}
            initial={{ opacity: 0, scale: 0.92, y, x }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, y, x }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`pointer-events-auto absolute z-50 w-max max-w-[220px] ${sideStyles[side]}`}
            onMouseEnter={onContentMouseEnter}
            onMouseLeave={onContentMouseLeave}
          >
            <div className="rounded-lg bg-foreground px-3 py-2 text-[11px] leading-relaxed text-background shadow-md">
              {content}
            </div>
            <span className={`absolute border-4 ${arrowStyles[side]}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
