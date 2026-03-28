'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import ExpertCard from '@/components/ExpertCard'
import type { Expert } from '@/types'

export function ExpertListClient({ experts }: { experts: Expert[] }) {
  const router = useRouter()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      {experts.map(expert => (
        <ExpertCard
          key={expert.id}
          expert={expert}
          onClick={() => router.push(`/experts/${expert.subdomain}`)}
        />
      ))}
    </motion.div>
  )
}
