import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { paymentId, parentId, parentName, parentEmail, amount, description } = await request.json()

    if (!paymentId || !parentId || !parentName || !parentEmail || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get payment details from Convex
    const payment = await convex.query(api.payments.getPayment, { id: paymentId as any })
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Try Stripe MCP to create product/price/payment link
    try {
      const mcp = (globalThis as any)
      if (mcp?.mcp_stripe_create_product && mcp?.mcp_stripe_create_price && mcp?.mcp_stripe_create_payment_link) {
        const product = await mcp.mcp_stripe_create_product({ name: 'Bank Transfer Payment', description: description || `Payment ${paymentId}` })
        const price = await mcp.mcp_stripe_create_price({ product: product.id, unit_amount: Number(amount), currency: 'usd' })
        const link = await mcp.mcp_stripe_create_payment_link({ price: price.id, quantity: 1 })

        // Best effort: ensure parent has a stripeCustomerId (mock if MCP customer not available)
        const parent = await convex.query(api.parents.getParent, { id: parentId as any })
        if (parent && !parent.stripeCustomerId && mcp?.mcp_stripe_create_customer) {
          try {
            const customer = await mcp.mcp_stripe_create_customer({ name: parentName, email: parentEmail })
            await convex.mutation(api.parents.updateParent, { id: parent._id, stripeCustomerId: customer.id })
          } catch {}
        }

        return NextResponse.json({ success: true, url: link.url, customerId: parent?.stripeCustomerId || null, message: 'Payment link created successfully via MCP' })
      }
    } catch (mcpErr) {
      console.log('MCP payment link not available, falling back to local form URL:', mcpErr)
    }

    // Fallback to local form URL
    const paymentUrl = `/payments/${paymentId}/checkout?amount=${amount}&name=${encodeURIComponent(parentName)}&email=${encodeURIComponent(parentEmail)}&parentId=${parentId}`
    return NextResponse.json({ success: true, url: paymentUrl, message: 'Payment link created (fallback)' })

  } catch (error) {
    console.error('Error creating payment link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Declare MCP function types
declare global {
  var mcp_stripe_create_customer: (params: { name: string, email?: string }) => Promise<{
    id: string
    name: string
    email: string
    created: number
    object: string
  }>
  var mcp_stripe_create_product: (params: { name: string, description?: string }) => Promise<{
    id: string
    name: string
  }>
  var mcp_stripe_create_price: (params: { product: string, unit_amount: number, currency: string }) => Promise<{
    id: string
    product: string
    unit_amount: number
    currency: string
  }>
  var mcp_stripe_create_payment_link: (params: { price: string, quantity: number }) => Promise<{
    id: string
    url: string
  }>
} 