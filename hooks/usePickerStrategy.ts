import { useState, useEffect } from 'react'

export type PickerStrategy = 'IOS' | 'ANDROID' | 'DESKTOP'

export function usePickerStrategy() {
  // Começamos assumindo IOS para coincidir com o SSR seguro (apenas renderiza o input)
  const [strategy, setStrategy] = useState<PickerStrategy>('IOS')

  useEffect(() => {
    // SSR Safety
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return
    }

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera
    
    // 1. Detecção absoluta de Ecossistema Apple Mobile (iOS / iPadOS)
    const isIPadOS = navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)
    const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPadOS
    
    if (isIOS) {
      setStrategy('IOS')
      return
    }

    // 2. Detecção de Android
    const isAndroid = /Android/i.test(ua)
    if (isAndroid) {
      setStrategy('ANDROID')
      return
    }

    // 3. Client Hints fallback para outros mobiles obscuros (tratamos como Android Sniper)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any
    if (nav.userAgentData && nav.userAgentData.mobile) {
      setStrategy('ANDROID')
      return
    }

    // 4. Se não caiu em nada acima, é Desktop
    setStrategy('DESKTOP')
  }, [])

  return strategy
}
