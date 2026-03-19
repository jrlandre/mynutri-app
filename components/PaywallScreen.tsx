"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

export default function PaywallScreen() {
  const router = useRouter()

  function handleShare() {
    const text = "Estou usando o MyNutri para fazer escolhas mais conscientes no mercado. Peça ao seu Expert para liberar acesso ilimitado pra você!"
    const url = "https://mynutri.pro"

    if (navigator.share) {
      navigator.share({ text, url }).catch(() => {})
    } else {
      const whatsapp = `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`
      window.open(whatsapp, "_blank")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center px-8 py-12 gap-6 text-center flex-1"
    >
      <div className="flex flex-col gap-2">
        <p className="text-lg font-semibold tracking-tight">
          Poxa, você esgotou suas solicitações...
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed text-balance">
          Seu acesso é ilimitado se você for cliente de um Expert parceiro.
        </p>
        <p className="text-lg font-semibold tracking-tight mt-1">
          Você já realiza acompanhamento com um profissional?
        </p>
      </div>

      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        <button
          onClick={handleShare}
          className="w-full flex flex-col items-center justify-center px-5 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <span className="text-sm font-medium">Sim</span>
          <span className="text-xs opacity-75">Solicitar acesso</span>
        </button>
        <button
          onClick={() => router.push('/experts')}
          className="w-full flex flex-col items-center justify-center px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.97] transition-all"
        >
          <span className="text-sm font-medium">Ainda não</span>
          <span className="text-xs text-muted-foreground">Encontre um Expert</span>
        </button>
      </div>

      <button
        onClick={() => router.push('/auth')}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Entrar com outra conta
      </button>
    </motion.div>
  )
}
