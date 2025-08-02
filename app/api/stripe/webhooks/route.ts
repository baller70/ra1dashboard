export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    
    // Parse the webhook event
    let event;
    try {
      event = JSON.parse(body)
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log('Checkout session completed:', session.id)
  
  // Extract payment information from session metadata
  if (session.metadata?.paymentId) {
    try {
      // Update payment status in Convex
      await convex.mutation(api.payments.updatePayment, {
        id: session.metadata.paymentId as any,
        status: 'paid',
        paidAt: Date.now()
      })
      
      console.log(`Payment ${session.metadata.paymentId} marked as paid`)
    } catch (error) {
      console.error('Error updating payment status:', error)
    }
  }
}

async function handlePaymentSucceeded(paymentIntent: any) {
  console.log('Payment succeeded:', paymentIntent.id)
  
  // Additional handling for payment success if needed
  // This could include sending confirmation emails, updating analytics, etc.
} 