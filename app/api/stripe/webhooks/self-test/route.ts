import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'node'

export async function POST() {
  try {
    // Only allow in Preview or when explicitly enabled
    const isPreview = process.env.VERCEL_ENV === 'preview'
    if (!isPreview) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET
    const sk = process.env.STRIPE_SECRET_KEY
    if (!secret || !sk) {
      return NextResponse.json({ ok: true, configured: false, verified: false })
    }

    const stripe = new Stripe(sk as string, { apiVersion: '2024-06-20' } as any)
    const payload = {
      id: 'evt_test_' + Date.now(),
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_' + Date.now(), mode: 'payment' } },
    }

    // Generate a test header using the same secret configured on the server
    const header = stripe.webhooks.generateTestHeaderString({ payload: JSON.stringify(payload), secret })

    // Verify we can construct a valid event with the configured secret
    const event = stripe.webhooks.constructEvent(JSON.stringify(payload), header, secret)
    if (!event || event.id !== payload.id) {
      return NextResponse.json({ ok: true, configured: true, verified: false }, { status: 200 })
    }

    return NextResponse.json({ ok: true, configured: true, verified: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unexpected' }, { status: 500 })
  }
}

