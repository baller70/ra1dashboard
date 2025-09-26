export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== 'ra1-dashboard-api-key-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId, paymentMethod } = await request.json()
    console.log('API received:', { paymentId, paymentMethod })

    if (!paymentId || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update payment method in Convex using existing updatePayment mutation
    const result = await convex.mutation(api.payments.updatePayment, {
      id: paymentId,
      paymentMethod
    })

    console.log('Convex mutation result:', result)

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Error updating payment method:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
