'use client'

import React, { useEffect, useRef } from 'react'

type CardElementProps = {
  onChange?: (complete: boolean) => void
  onReady?: () => void
}

export function CardElement({ onChange, onReady }: CardElementProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    onReady?.()
  }, [onReady])

  return (
    <div
      ref={ref}
      className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 flex items-center text-gray-700"
    >
      {/* Placeholder for Stripe Element mount; implement with @stripe/stripe-js if desired */}
      <span className="text-sm text-gray-500">Card details will be entered here</span>
    </div>
  )
}


