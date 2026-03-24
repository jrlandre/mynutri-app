import { useState, useEffect } from 'react'

export type PickerStrategy = 'NATIVE' | 'CUSTOM'

export function usePickerStrategy() {
  // Começamos assumindo NATIVE para coincidir com o SSR
  // (O input file nativo será renderizado no servidor por segurança)
  const [strategy, setStrategy] = useState<PickerStrategy>('NATIVE')

  useEffect(() => {
    // SSR Safety
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return
    }

    // 1. Detecção Moderna e Confiável (Client Hints)
    // Usamos 'any' aqui porque userAgentData ainda não é padrão em todos os TypeScripts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any
    if (nav.userAgentData && nav.userAgentData.mobile !== undefined) {
      setStrategy(nav.userAgentData.mobile ? 'NATIVE' : 'CUSTOM')
      return
    }

    // 2. Fallback legado para navegadores antigos/Safari
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera
    const isLegacyMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    
    // Desmascarando o iPadOS moderno (que mente dizendo ser MacIntel no UA)
    const isIPadOS = navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)
    
    if (isLegacyMobile || isIPadOS) {
      setStrategy('NATIVE')
    } else {
      setStrategy('CUSTOM')
    }
  }, [])

  return strategy
}
