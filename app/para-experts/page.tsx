import type { Metadata } from 'next'
import { ParaExpertsClient } from './ParaExpertsClient'

export const metadata: Metadata = {
  title: 'Para Experts — MyNutri',
  description:
    'Configure uma vez. Seus clientes têm respostas 24h com o seu protocolo. Grátis por 14 dias.',
  openGraph: {
    title: 'Para Experts — MyNutri',
    description:
      'Configure uma vez. Seus clientes têm respostas 24h com o seu protocolo. Grátis por 14 dias.',
    url: 'https://mynutri.pro/para-experts',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MyNutri' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Para Experts — MyNutri',
    description:
      'Configure uma vez. Seus clientes têm respostas 24h com o seu protocolo. Grátis por 14 dias.',
    images: ['/og-default.png'],
  },
}

export default function ParaExpertsPage() {
  return <ParaExpertsClient />
}
