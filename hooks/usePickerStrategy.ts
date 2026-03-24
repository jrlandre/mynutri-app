import { useState, useEffect } from 'react'

export type PickerStrategy = 'IOS' | 'ANDROID' | 'DESKTOP' | 'RESOLVING'

export function usePickerStrategy() {
  // Estado inicial neutro para evitar hidratação errada no SSR
  const [strategy, setStrategy] = useState<PickerStrategy>('RESOLVING')

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera
    
    // 1. Detecção absoluta de Ecossistema Apple Mobile (iOS / iPadOS)
    const isIPadOS = navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)
    const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPadOS
    
    if (isIOS) return setStrategy('IOS')

    // 2. Detecção de Android
    const isAndroid = /Android/i.test(ua)
    if (isAndroid) return setStrategy('ANDROID')

    // 3. Client Hints fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any
    if (nav.userAgentData?.mobile) return setStrategy('ANDROID')

    // 4. Desktop
    setStrategy('DESKTOP')
  }, [])

  return strategy
}
