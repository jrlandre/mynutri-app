'use client'

import { useEffect } from 'react'

interface Props {
  value: number
  currency: string
  transactionId: string
}

export function ObrigadoClient({ value, currency, transactionId }: Props) {
  useEffect(() => {
    ;(window as unknown as { dataLayer: unknown[] }).dataLayer =
      (window as unknown as { dataLayer: unknown[] }).dataLayer || []
    ;(window as unknown as { dataLayer: unknown[] }).dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: transactionId,
        value,
        currency,
        items: [{ item_name: 'MyNutri Expert Plan', quantity: 1, price: value }],
      },
    })
  }, [value, currency, transactionId])

  return null
}
