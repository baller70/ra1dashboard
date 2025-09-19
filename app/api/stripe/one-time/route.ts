export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable')
  }
  return new Stripe(secret, { apiVersion: '2024-06-20' } as any)
}

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { parentId, paymentId, amount, description } = body || {}

    if (!parentId || !paymentId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: parentId, paymentId, amount' },
        { status: 400 }
      )
    }

    // Fetch parent record
    const parent = await convex.query(api.parents.getParent, { id: parentId as any })
    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    const useMcp = process.env.USE_STRIPE_MCP === 'true'
    const mcp = (globalThis as any)
    const mcpAvailable = Boolean(
      mcp?.mcp_stripe_create_product &&
      mcp?.mcp_stripe_create_price &&
      mcp?.mcp_stripe_create_payment_link
    )

    // MCP-first flow only if explicitly enabled
    if (useMcp || (!process.env.STRIPE_SECRET_KEY && mcpAvailable)) {
      try {
        if (mcpAvailable) {
        // Create customer via MCP if possible (best effort)
        try {
          if (mcp?.mcp_stripe_create_customer && !parent.stripeCustomerId) {
            const customer = await mcp.mcp_stripe_create_customer({ name: parent.name, email: parent.email })
            await convex.mutation(api.parents.updateParent, { id: parent._id, stripeCustomerId: customer.id })
          }
        } catch {}

        const product = await mcp.mcp_stripe_create_product({ name: 'One-Time Payment', description: description || `Payment ${paymentId}` })
        const price = await mcp.mcp_stripe_create_price({ product: product.id, unit_amount: Number(amount), currency: 'usd' })
        const link = await mcp.mcp_stripe_create_payment_link({ price: price.id, quantity: 1 })

        return NextResponse.json({ success: true, url: link.url, paymentLinkId: link.id })
        }
      } catch (mcpErr) {
        console.log('MCP flow not available, falling back to Stripe SDK:', mcpErr)
      }
    }

    // Stripe SDK fallback (preferred when STRIPE_SECRET_KEY is configured)
    let stripe: Stripe | null = null
    try {
      stripe = getStripe()
    } catch (stripeInitErr) {
      // If stripe is not configured but MCP is available, try MCP as ultimate fallback
      if (mcpAvailable) {
        try {
          const product = await mcp.mcp_stripe_create_product({ name: 'One-Time Payment', description: description || `Payment ${paymentId}` })
          const price = await mcp.mcp_stripe_create_price({ product: product.id, unit_amount: Number(amount), currency: 'usd' })
          const link = await mcp.mcp_stripe_create_payment_link({ price: price.id, quantity: 1 })
          return NextResponse.json({ success: true, url: link.url, paymentLinkId: link.id })
        } catch (finalMcpErr) {
          console.error('MCP fallback failed after Stripe init error:', finalMcpErr)
          throw stripeInitErr
        }
      }
      throw stripeInitErr
    }

    let stripeCustomerId: string | undefined = parent.stripeCustomerId

    // Ensure the stored customer exists in the current Stripe environment (test vs live are separate)
    if (stripeCustomerId) {
      try {
        await stripe.customers.retrieve(stripeCustomerId)
      } catch (err: any) {
        const msg = err?.message || ''
        const code = (err as any)?.raw?.code
        // If the customer came from the other mode, Stripe returns "No such customer" / resource_missing
        if (msg.includes('No such customer') || code === 'resource_missing') {
          stripeCustomerId = undefined
        } else {
          throw err
        }
      }
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: parent.name,
        email: parent.email,
        phone: parent.phone || undefined,
        metadata: { parentId: parent._id, source: 'ra1-app' },
      })
      stripeCustomerId = customer.id
      await convex.mutation(api.parents.updateParent, { id: parent._id, stripeCustomerId })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Number(amount),
            product_data: { name: 'One-Time Payment', description: description || `Payment ${paymentId}` },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/payments/${paymentId}?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payments/${paymentId}?status=cancelled`,
      metadata: { parentId: String(parent._id), paymentId: String(paymentId), source: 'one_time_checkout' },
    })

    return NextResponse.json({ success: true, url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error('Error creating one-time payment checkout session:', error)
    const message = error?.message || 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


