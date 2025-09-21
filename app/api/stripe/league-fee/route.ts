export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { leagueFeeId, parentId } = await request.json()

    if (!leagueFeeId || !parentId) {
      return NextResponse.json({ error: 'Missing required fields: leagueFeeId, parentId' }, { status: 400 })
    }

    // Get league fee details from Convex
    const leagueFee = await convex.query(api.leagueFees.getLeagueFee, { id: leagueFeeId as any })
    if (!leagueFee) {
      return NextResponse.json({ error: 'League fee not found' }, { status: 404 })
    }

    // Get parent details
    const parent = await convex.query(api.parents.getParent, { id: parentId as any })
    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    // Get season details
    const season = await convex.query(api.seasons.getSeason, { id: leagueFee.seasonId })
    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    // Check if fee is already paid
    if (leagueFee.status === 'paid') {
      return NextResponse.json({ error: 'League fee is already paid' }, { status: 400 })
    }

    // Only create payment links for online payments
    if (leagueFee.paymentMethod !== 'online') {
      return NextResponse.json({ error: 'Payment links are only available for online payments' }, { status: 400 })
    }

    const parentName = parent.emergencyContact?.name || parent.name || 'Parent'
    const parentEmail = parent.email || parent.emergencyContact?.email || ''
    const amount = Math.round(leagueFee.totalAmount * 100) // Convert to cents
    const description = `${season.name} - League Fee Payment`

    // Try Stripe MCP to create product/price/payment link
    try {
      const mcp = (globalThis as any)
      if (mcp?.mcp_stripe_create_product && mcp?.mcp_stripe_create_price && mcp?.mcp_stripe_create_payment_link) {
        const product = await mcp.mcp_stripe_create_product({ 
          name: `${season.name} - League Fee`, 
          description: `League fee payment for ${season.name}` 
        })
        
        const price = await mcp.mcp_stripe_create_price({ 
          product: product.id, 
          unit_amount: amount, 
          currency: 'usd' 
        })
        
        const link = await mcp.mcp_stripe_create_payment_link({ 
          price: price.id, 
          quantity: 1,
          metadata: {
            leagueFeeId: leagueFee._id,
            parentId: parent._id,
            seasonId: season._id,
            source: 'league_fee_payment'
          }
        })

        // Ensure parent has a stripeCustomerId
        if (!parent.stripeCustomerId && mcp?.mcp_stripe_create_customer) {
          try {
            const customer = await mcp.mcp_stripe_create_customer({ 
              name: parentName, 
              email: parentEmail,
              metadata: {
                parentId: parent._id,
                source: 'league_fee_system'
              }
            })
            await convex.mutation(api.parents.updateParent, { 
              id: parent._id, 
              stripeCustomerId: customer.id 
            })
          } catch (customerError) {
            console.log('Failed to create Stripe customer:', customerError)
          }
        }

        // Update league fee with payment link ID
        await convex.mutation(api.leagueFees.updateLeagueFee, {
          id: leagueFee._id,
          stripePaymentLinkId: link.id,
          updatedAt: Date.now()
        })

        return NextResponse.json({ 
          success: true, 
          url: link.url, 
          paymentLinkId: link.id,
          customerId: parent?.stripeCustomerId || null, 
          message: 'League fee payment link created successfully' 
        })
      }
    } catch (mcpErr) {
      console.log('MCP payment link not available, falling back to local form URL:', mcpErr)
    }

    // Fallback: Return a local payment form URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const fallbackUrl = `${baseUrl}/payments/league-fee/${leagueFee._id}?parent=${parent._id}`

    return NextResponse.json({
      success: true,
      url: fallbackUrl,
      paymentLinkId: null,
      customerId: parent?.stripeCustomerId || null,
      message: 'Fallback payment form URL created (Stripe MCP not available)',
      fallback: true
    })

  } catch (error) {
    console.error('Error creating league fee payment link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve existing payment link
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueFeeId = searchParams.get('leagueFeeId')

    if (!leagueFeeId) {
      return NextResponse.json({ error: 'League fee ID is required' }, { status: 400 })
    }

    // Get league fee details
    const leagueFee = await convex.query(api.leagueFees.getLeagueFee, { id: leagueFeeId as any })
    if (!leagueFee) {
      return NextResponse.json({ error: 'League fee not found' }, { status: 404 })
    }

    // Get season details
    const season = await convex.query(api.seasons.getSeason, { id: leagueFee.seasonId })
    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      leagueFee: {
        ...leagueFee,
        season
      },
      hasPaymentLink: !!leagueFee.stripePaymentLinkId,
      paymentLinkId: leagueFee.stripePaymentLinkId
    })

  } catch (error) {
    console.error('Error retrieving league fee payment link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
