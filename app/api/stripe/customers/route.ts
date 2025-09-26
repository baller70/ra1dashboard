export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { parentId, name, email, phone } = await request.json()

    if (!parentId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get parent from Convex
    const parent = await convex.query(api.parents.getParent, { id: parentId as any })
    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    // Create real Stripe customer using production keys
    const { stripe } = await import('@/lib/stripe')

    const customer = await stripe.customers.create({
      email: parent.email,
      name: parent.name,
      metadata: {
        source: 'ra1_dashboard',
        parentId: parent._id,
      }
    })

    // Update parent in Convex with real Stripe customer ID
    await convex.mutation(api.parents.updateParent, {
      id: parent._id,
      stripeCustomerId: customer.id
    })

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      message: 'Stripe customer created successfully'
    })

  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    if (!parentId) {
      return NextResponse.json({ error: 'Parent ID is required' }, { status: 400 })
    }

    // Get parent from Convex
    const parent = await convex.query(api.parents.getParent, { id: parentId as any })
    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    if (!parent.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found for this parent' }, { status: 404 })
    }

    // Return mock customer data for now
    const mockCustomer = {
      id: parent.stripeCustomerId,
      name: parent.name,
      email: parent.email,
      created: Math.floor(Date.now() / 1000),
      object: 'customer'
    }

    return NextResponse.json({
      success: true,
      customer: mockCustomer
    })

  } catch (error) {
    console.error('Error retrieving Stripe customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 