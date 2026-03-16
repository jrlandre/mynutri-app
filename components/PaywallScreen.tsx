"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

export default function PaywallScreen() {
  const router = useRouter()

  function handleShare() {
    const text = "Estou usando o mynutri.food para fazer escolhas mais conscientes no mercado. Peça à sua nutricionista para liberar acesso ilimitado pra você!"
    const url = "https://mynutri.food"

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
          Limite diário atingido
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Acesso ilimitado exclusivo para pacientes.{" "}
          <span className="text-foreground font-medium">
            Indique o mynutri para sua nutricionista.
          </span>
        </p>
      </div>

      <button
        onClick={handleShare}
        className="w-full max-w-xs flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all cursor-pointer"
      >
        Indicar para minha nutricionista
      </button>

      <button
        onClick={() => router.push('/auth')}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Entrar com outra conta
      </button>
    </motion.div>
  )
}
