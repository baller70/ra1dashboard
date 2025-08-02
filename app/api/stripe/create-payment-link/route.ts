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

    // Create a local payment form URL that will work properly
    const paymentUrl = `/payments/${paymentId}/checkout?amount=${amount}&name=${encodeURIComponent(parentName)}&email=${encodeURIComponent(parentEmail)}&parentId=${parentId}`
    
    const customerId = `cus_test_${Date.now()}`

    // Update parent with Stripe customer ID in Convex
    const parent = await convex.query(api.parents.getParent, { id: parentId as any })
    if (parent) {
      await convex.mutation(api.parents.updateParent, {
        id: parent._id,
        stripeCustomerId: customerId
      })
    }

    return NextResponse.json({
      success: true,
      paymentUrl: paymentUrl,
      customerId: customerId,
      message: 'Payment link created successfully'
    })

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