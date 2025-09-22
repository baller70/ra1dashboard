export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe
function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    console.warn('STRIPE_SECRET_KEY not configured - using mock payment links')
    return null
  }
  return new Stripe(secret, { apiVersion: '2024-06-20' } as any)
}

// Mock league fees data (should match the data from other routes)
let mockLeagueFees: any[] = [
  {
    _id: "temp_fee_1",
    parentId: "j971g9n5ve0qqsby21a0k9n1js7n7tbx",
    seasonId: "temp_season_1",
    amount: 95,
    processingFee: 3.06,
    totalAmount: 98.06,
    paymentMethod: "online",
    status: "pending",
    dueDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
    remindersSent: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    season: {
      _id: "temp_season_1",
      name: "Summer League 2024",
      type: "summer_league",
      year: 2024
    },
    parent: {
      _id: "j971g9n5ve0qqsby21a0k9n1js7n7tbx",
      name: "Kevin Houston",
      email: "khouston721@gmail.com"
    }
  }
]

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

    // Find the league fee
    const fee = mockLeagueFees.find(f => f._id === feeId && f.parentId === parentId)
    
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
