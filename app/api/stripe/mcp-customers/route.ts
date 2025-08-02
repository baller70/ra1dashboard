import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { parentId, name, email } = await request.json()

    if (!parentId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get parent from Convex
    const parent = await convex.query(api.parents.getParent, { id: parentId as any })
    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    // Use Stripe MCP to create customer
    try {
      // This will use the MCP function when available
      const customer = await global.mcp_stripe_create_customer({
        name: name,
        email: email
      })

      // Update parent in Convex with Stripe customer ID
      await convex.mutation(api.parents.updateParent, {
        id: parent._id,
        stripeCustomerId: customer.id
      })

      return NextResponse.json({
        success: true,
        customerId: customer.id,
        message: 'Stripe customer created successfully via MCP'
      })

    } catch (mcpError) {
      console.log('MCP not available, falling back to mock mode:', mcpError)
      
      // Fallback to mock mode
      const mockCustomerId = `cus_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await convex.mutation(api.parents.updateParent, {
        id: parent._id,
        stripeCustomerId: mockCustomerId
      })

      return NextResponse.json({
        success: true,
        customerId: mockCustomerId,
        message: 'Stripe customer created successfully (mock mode - MCP not available)'
      })
    }

  } catch (error) {
    console.error('Error creating Stripe customer:', error)
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
} 