"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

export default function LoginGateScreen() {
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center px-8 py-12 gap-6 text-center flex-1"
    >
      <div className="flex flex-col gap-2">
        <p className="text-lg font-semibold tracking-tight">
          Você usou sua análise gratuita de hoje.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed text-balance">
          Crie uma conta gratuita e tenha até 3 análises por dia — sem precisar de um Expert.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        <button
          onClick={() => router.push('/auth')}
          className="w-full flex flex-col items-center justify-center px-5 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <span className="text-sm font-medium">Criar conta gratuita</span>
          <span className="text-xs opacity-75">3 análises por dia</span>
        </button>
        <button
          onClick={() => router.push('/auth')}
          className="w-full flex flex-col items-center justify-center px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.97] transition-all"
        >
          <span className="text-sm font-medium">Já tenho conta</span>
          <span className="text-xs text-muted-foreground">Entrar</span>
        </button>
      </div>
    </motion.div>
  )
}
