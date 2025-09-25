export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { ensureCustomerByEmailAndFingerprint } from '@/lib/stripe'


const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }
  return new Stripe(secret, { apiVersion: '2024-06-20' } as any)
}

export async function POST(request: NextRequest) {
  try {
    const { parentId, parentEmail, parentName, parentPhone, paymentId, amount, description, paymentMethodId } = await request.json()
    if (!parentId || !amount) {
      return NextResponse.json({ error: 'Missing required fields: parentId, amount' }, { status: 400 })
    }

    const stripe = getStripe()

    // Get parent from Convex; fall back to request-provided identity in preview if Convex is unavailable
    let parent: any = null
    try {
      parent = await convex.query(api.parents.getParent as any, { id: parentId as any })
    } catch (e) {
      // ignore and use fallback below
    }
    if (!parent) {
      if (!parentEmail || !parentName) {
        return NextResponse.json({ error: 'Parent not found and no identity provided' }, { status: 404 })
      }
      parent = { _id: parentId, email: String(parentEmail), name: String(parentName), phone: parentPhone || undefined }
    }

    // If a paymentMethodId is provided, use two-factor matching (email + card fingerprint)
    if (paymentMethodId) {
      const { customerId, paymentMethodId: pmId } = await ensureCustomerByEmailAndFingerprint(
        String(paymentMethodId),
        String(parent.email),
        String(parent.name),
        parent.phone || undefined,
        { parentId: String(parent._id), source: 'ra1-app' }
      )

      await convex.mutation(api.parents.updateParent as any, {
        id: parent._id,
        stripeCustomerId: customerId,
        stripePaymentMethodId: pmId,
      })

      const intent = await stripe.paymentIntents.create({
        amount: Number(amount),
        currency: 'usd',
        customer: customerId,
        payment_method: pmId,
        setup_future_usage: 'off_session',
        automatic_payment_methods: { enabled: true },
        metadata: {
          source: 'one_time_inapp',
          parentId: String(parent._id || parentId),
          paymentId: paymentId ? String(paymentId) : '',
        },
        description: description || 'One-time payment',
      })

      return NextResponse.json({ success: true, clientSecret: intent.client_secret, paymentIntentId: intent.id })
    }

    // Fallback: existing behavior (email-only). Ensure Stripe customer by creating if missing
    let stripeCustomerId: string | undefined = parent.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: parent.name,
        email: parent.email,
        phone: parent.phone || undefined,
        metadata: { parentId: parent._id, source: 'ra1-app' },
      })
      stripeCustomerId = customer.id
      await convex.mutation(api.parents.updateParent as any, { id: parent._id, stripeCustomerId })
    }

    const intent = await stripe.paymentIntents.create({
      amount: Number(amount),
      currency: 'usd',
      customer: stripeCustomerId,
      setup_future_usage: 'off_session',
      automatic_payment_methods: { enabled: true },
      metadata: {
        source: 'one_time_inapp',
        parentId: String(parent._id || parentId),
        paymentId: paymentId ? String(paymentId) : '',
      },
      description: description || 'One-time payment',
    })

    return NextResponse.json({ success: true, clientSecret: intent.client_secret, paymentIntentId: intent.id })
  } catch (error: any) {
    console.error('Create PaymentIntent error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create PaymentIntent' }, { status: 500 })
  }
}


