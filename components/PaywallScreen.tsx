"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

export default function PaywallScreen() {
  const router = useRouter()
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null)

  function handleShare() {
    const text = "Estou usando o MyNutri para fazer escolhas mais conscientes no mercado. Peça à sua nutricionista para liberar acesso ilimitado pra você!"
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
      <AnimatePresence mode="wait">
        {answer === null && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-6 w-full"
          >
            <div className="flex flex-col gap-2">
              <p className="text-lg font-semibold tracking-tight">
                Puxa, você esgotou suas solicitações...
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Atualmente, o acesso é ilimitado se você for cliente de um profissional de nutrição parceiro.{" "}
                <span className="text-foreground font-medium">
                  Você já realiza acompanhamento nutricional?
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button
                onClick={() => setAnswer("yes")}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"
              >
                Sim
              </button>
              <button
                onClick={() => setAnswer("no")}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted active:scale-[0.97] transition-all"
              >
                Ainda não
              </button>
            </div>

            <button
              onClick={() => router.push('/auth')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Entrar com outra conta
            </button>
          </motion.div>
        )}

        {answer === "yes" && (
          <motion.div
            key="yes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-6 w-full"
          >
            <div className="flex flex-col gap-2">
              <p className="text-lg font-semibold tracking-tight">
                Ótimo! Peça para ela liberar
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Compartilhe o MyNutri com sua nutricionista — quando ela se tornar parceira, você terá acesso ilimitado.
              </p>
            </div>

            <button
              onClick={handleShare}
              className="w-full max-w-xs flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"
            >
              Indicar para minha nutricionista
            </button>

            <button
              onClick={() => setAnswer(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Voltar
            </button>
          </motion.div>
        )}

        {answer === "no" && (
          <motion.div
            key="no"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-6 w-full"
          >
            <div className="flex flex-col gap-2">
              <p className="text-lg font-semibold tracking-tight">
                Encontre um profissional parceiro
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nossos nutricionistas parceiros usam o MyNutri como parte do acompanhamento — e você ganha acesso ilimitado incluso.
              </p>
            </div>

            {/* Placeholder — lista de nutricionistas parceiros futuramente */}
            <div className="w-full max-w-xs px-4 py-4 rounded-xl border border-border bg-card text-sm text-muted-foreground">
              Em breve: lista de nutricionistas parceiros disponíveis na sua região.
            </div>

            <button
              onClick={() => setAnswer(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Voltar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
