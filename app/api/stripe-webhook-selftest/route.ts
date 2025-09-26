import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const env = process.env.VERCEL_ENV || 'development'
    if (env === 'production') {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret) {
      return NextResponse.json({ ok: true, configured: false, verified: false })
    }

    const stripe = new Stripe('sk_test_dummy' as any, { apiVersion: '2024-06-20' } as any)
    const payload = {
      id: 'evt_test_' + Date.now(),
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_' + Date.now(), mode: 'payment' } },
    }

    const header = stripe.webhooks.generateTestHeaderString({ payload: JSON.stringify(payload), secret })
    const event = stripe.webhooks.constructEvent(JSON.stringify(payload), header, secret)

    const verified = !!event && event.id === payload.id
    return NextResponse.json({ ok: true, configured: true, verified })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unexpected' }, { status: 500 })
  }
}

