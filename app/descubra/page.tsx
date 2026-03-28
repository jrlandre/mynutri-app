import type { Metadata } from 'next'
import { DescubraClient } from './DescubraClient'

export const metadata: Metadata = {
  title: 'MyNutri — IA nutricional personalizada pelo seu expert',
  description:
    'Nutricionistas e profissionais de performance oferecem IA personalizada para seus clientes. Orientação especializada 24h, na hora que precisa.',
}

export default function DescubraPage() {
  return <DescubraClient />
}
