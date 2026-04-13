'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import ExpertCard from '@/components/ExpertCard'
import type { Expert } from '@/types'

export function ExpertListClient({ experts }: { experts: Expert[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      {experts.map(expert => (
        <Link key={expert.id} href={`/experts/${expert.subdomain}`} className="block">
          <ExpertCard expert={expert} />
        </Link>
      ))}
    </motion.div>
  )
}
