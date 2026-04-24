"use client"

import { useState, useRef, useEffect } from "react"
import { Tooltip as BaseTooltip } from "@base-ui/react"

const AUTO_CLOSE_MS = 6_000

interface Props {
  content: React.ReactNode
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
}

export function Tooltip({ content, children, side = "top" }: Props) {
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)
  const [manual, setManual] = useState(false)
  const manualTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const open = hovering || focused || manual

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick() {
      setManual(false)
      setHovering(false)
      setFocused(false)
      if (manualTimer.current) { clearTimeout(manualTimer.current); manualTimer.current = null }
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [open])

  function onMouseEnter() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setHovering(true)
  }

  function onMouseLeave() {
    hoverTimer.current = setTimeout(() => setHovering(false), 100)
  }

  function onClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setManual(true)
    if (manualTimer.current) clearTimeout(manualTimer.current)
    manualTimer.current = setTimeout(() => {
      setManual(false)
      manualTimer.current = null
    }, AUTO_CLOSE_MS)
  }

  return (
    <BaseTooltip.Provider>
      <BaseTooltip.Root open={open}>
        <BaseTooltip.Trigger
          render={
            <span
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onClick={onClick}
            />
          }
        >
          {children}
        </BaseTooltip.Trigger>

        <BaseTooltip.Portal>
          <BaseTooltip.Positioner side={side} sideOffset={6} align="center">
            <BaseTooltip.Popup
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              className="z-50 max-w-[220px] rounded-lg bg-foreground px-3 py-2 text-[11px] leading-relaxed text-background shadow-md
                data-[starting-style]:opacity-0 data-[starting-style]:scale-95
                data-[ending-style]:opacity-0 data-[ending-style]:scale-95
                transition-[opacity,scale] duration-150 ease-out"
            >
              {content}
              <BaseTooltip.Arrow className="fill-foreground" />
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  )
}
