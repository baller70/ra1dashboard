export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { convexHttp } from '@/lib/convex-server'
import { api } from '@/convex/_generated/api'

// Initialize Stripe
function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    console.warn('STRIPE_SECRET_KEY not configured - using mock payment links')
    return null
  }
  return new Stripe(secret, { apiVersion: '2024-06-20' } as any)
}

// Helper to get mock league fees from the main route
async function getMockLeagueFees() {
  try {
    const { mockLeagueFees } = await import('@/app/api/league-fees/route')
    return mockLeagueFees
  } catch (e) {
    console.warn('Failed to import mockLeagueFees:', e)
    return []
  }
}

// Generate actual Stripe payment link for a league fee
const generateStripePaymentLink = async (fee: any) => {
  const stripe = getStripe()

  if (!stripe) {
    // Fallback to local payment page if Stripe is not configured
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'
    return `${baseUrl}/pay/league-fee/${fee._id}?parent=${fee.parentId}&amount=${fee.totalAmount}`
  }

  try {
    // Create or get Stripe customer for the parent
    let customerId = fee.parent.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: fee.parent.name,
        email: fee.parent.email,
        metadata: {
          parentId: fee.parentId,
          source: 'ra1_league_fees'
        }
      })
      customerId = customer.id
    }

    // Create a product for the league fee
    const product = await stripe.products.create({
      name: `${fee.season.name} - League Fee`,
      description: `League fee payment for ${fee.season.name}`,
      metadata: {
        leagueFeeId: fee._id,
        parentId: fee.parentId,
        seasonId: fee.seasonId,
        source: 'league_fee_payment'
      }
    })

    // Create a price for the league fee
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(fee.totalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        leagueFeeId: fee._id,
        parentId: fee.parentId,
        seasonId: fee.seasonId
      }
    })

    // Create the payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1
        }
      ],
      metadata: {
        leagueFeeId: fee._id,
        parentId: fee.parentId,
        seasonId: fee.seasonId,
        source: 'league_fee_payment'
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'}/payments/success?fee=${fee._id}`
        }
      }
    })

    return paymentLink.url

  } catch (error) {
    console.error('Error creating Stripe payment link:', error)
    // Fallback to local payment page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'
    return `${baseUrl}/pay/league-fee/${fee._id}?parent=${fee.parentId}&amount=${fee.totalAmount}`
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feeId = searchParams.get('feeId')
    const parentId = searchParams.get('parentId')

    if (!feeId || !parentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: feeId, parentId'
        },
        { status: 400 }
      )
    }

    // Try to find the league fee from Convex first, then fallback to mock
    let fee: any = null
    let parent: any = null
    let season: any = null

    // Try Convex first
    try {
      fee = await convexHttp.query(api.leagueFees.getLeagueFee as any, { id: feeId as any })
      if (fee) {
        parent = await convexHttp.query(api.parents.getParent as any, { id: fee.parentId as any }).catch(() => null)
        season = await convexHttp.query(api.seasons.getSeason as any, { id: fee.seasonId as any }).catch(() => null)
        fee = { ...fee, parent, season }
      }
    } catch (e) {
      console.warn('Convex query failed, trying mock data:', e)
    }

    // Fallback to mock data
    if (!fee) {
      const mockLeagueFees = await getMockLeagueFees()
      fee = mockLeagueFees.find((f: any) => f._id === feeId && f.parentId === parentId)
    }

    if (!fee) {
      return NextResponse.json(
        {
          success: false,
          error: 'League fee not found'
        },
        { status: 404 }
      )
    }

    if (fee.status === 'paid') {
      return NextResponse.json(
        {
          success: false,
          error: 'This league fee has already been paid'
        },
        { status: 400 }
      )
    }

    // Generate the Stripe payment link
    const paymentLink = await generateStripePaymentLink(fee)

    return NextResponse.json({
      success: true,
      data: {
        paymentLink,
        fee: {
          _id: fee._id,
          amount: fee.amount,
          processingFee: fee.processingFee,
          totalAmount: fee.totalAmount,
          season: fee.season,
          parent: fee.parent,
          dueDate: fee.dueDate,
          status: fee.status
        }
      }
    })

  } catch (error) {
    console.error('Error generating payment link:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
