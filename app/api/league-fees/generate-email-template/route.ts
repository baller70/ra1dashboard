export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { convexHttp } from '@/lib/convex-server'
import { api } from '@/convex/_generated/api'

// Note: We no longer rely on mock data here. We fetch real data from Convex for season/parent.

// Generate Stripe payment link (same logic as send-bulk-reminders)
const generateStripePaymentLink = async (parent: any, fee: any) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    
    if (!stripe || !process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe not configured')
    }

    // Create or get customer
    let customer
    try {
      if (parent.stripeCustomerId) {
        customer = await stripe.customers.retrieve(parent.stripeCustomerId)
      } else {
        customer = await stripe.customers.create({
          email: parent.email,
          name: parent.name,
          metadata: {
            parentId: parent._id,
            source: 'league_fee_payment'
          }
        })
      }
    } catch (customerError) {
      customer = await stripe.customers.create({
        email: parent.email,
        name: parent.name,
        metadata: {
          parentId: parent._id,
          source: 'league_fee_payment'
        }
      })
    }

    // Create product
    const product = await stripe.products.create({
      name: `${fee.season.name} - League Fee`,
      description: `League fee payment for ${fee.season.name}`,
      metadata: {
        seasonId: fee.seasonId,
        parentId: parent._id,
        source: 'league_fee_payment'
      }
    })

    // Create price (amount in cents)
    const price = await stripe.prices.create({
      unit_amount: Math.round(fee.totalAmount * 100),
      currency: 'usd',
      product: product.id,
      metadata: {
        leagueFeeId: fee._id,
        parentId: parent._id,
        seasonId: fee.seasonId,
        source: 'league_fee_payment'
      }
    })

    // Create payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      metadata: {
        leagueFeeId: fee._id,
        parentId: parent._id,
        seasonId: fee.seasonId,
        source: 'league_fee_payment'
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'}/payments/success?type=league_fee&fee_id=${fee._id}`
        }
      }
    })

    return paymentLink.url

  } catch (error) {
    console.error('Error creating Stripe payment link:', error)
    // Fallback to local payment page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'
    return `${baseUrl}/pay/league-fee/${fee._id}?parent=${parent._id}&amount=${fee.totalAmount}`
  }
}

// Generate AI-powered personalized email content
const generatePersonalizedEmail = async (parent: any, fee: any, paymentLink: string) => {
  const facilityPaymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'}/pay/facility/${fee._id}?parent=${parent._id}`
  
  const subject = `League Fee Payment Reminder - ${fee.season.name}`
  
  // AI-generated personalized email content
  const body = `Dear ${parent.name},

I hope this message finds you and your family well! 

This is a friendly reminder that the league fee for ${fee.season.name} is due on ${new Date(fee.dueDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}.

PAYMENT DETAILS:
• League Fee: $${fee.amount}
• Processing Fee: $${fee.processingFee} (online payments only)
• Total Amount: $${fee.totalAmount}

You have two convenient payment options:

🔗 OPTION 1: Pay Online (Credit/Debit Card)
Click here to pay securely online: ${paymentLink}
Total: $${fee.totalAmount} (includes $${fee.processingFee} processing fee)

🏢 OPTION 2: Pay at the Facility
Click here to confirm facility payment: ${facilityPaymentLink}
Total: $${fee.amount} (no processing fee)

If you choose to pay at the facility, please bring cash or check made payable to "Rise as One Basketball" and click the link above to confirm your payment method.

If you have any questions about the league fee or need to discuss payment arrangements, please don't hesitate to reach out to me directly.

Thank you for your continued support of our basketball program. Your investment helps us provide the best possible experience for all our young athletes!

Best regards,

Kevin Houston
Rise as One Director
"A program built by hard working kids and realistic parents"

Email: khouston721@gmail.com
Phone: (908) 810-1720

---
This is an automated reminder. If you have already paid, please disregard this message.`

  return { subject, body }
}

export async function POST(request: NextRequest) {
  try {
    const { seasonId, parentIds } = await request.json()

    if (!seasonId || !parentIds || !Array.isArray(parentIds) || parentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Season ID and parent IDs are required' },
        { status: 400 }
      )
    }

    // Fetch real season and parent from Convex
    const season = await (convexHttp as any).query(api.seasons.getSeason as any, { id: seasonId as any })
    if (!season) {
      return NextResponse.json(
        { success: false, error: 'Season not found' },
        { status: 404 }
      )
    }

    const sampleParentId = parentIds[0]
    const sampleParent = await (convexHttp as any).query(api.parents.getParent as any, { id: sampleParentId as any })
    if (!sampleParent) {
      return NextResponse.json(
        { success: false, error: 'Parent not found' },
        { status: 404 }
      )
    }

    // Build a sample fee object (do not persist during preview)
    const sampleFee = {
      _id: `fee_${seasonId}_${sampleParentId}`,
      parentId: sampleParentId,
      seasonId: seasonId,
      amount: 95,
      processingFee: 3.06,
      totalAmount: 98.06,
      paymentMethod: 'online',
      status: 'pending',
      dueDate: new Date('2025-10-21').getTime(),
      remindersSent: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      season
    }

    // Generate Stripe payment link for sample
    const samplePaymentLink = await generateStripePaymentLink(sampleParent, sampleFee)
    
    // Generate AI email template
    const emailTemplate = await generatePersonalizedEmail(sampleParent, sampleFee, samplePaymentLink)
    
    // Create facility payment link
    const facilityPaymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'}/pay/facility/${sampleFee._id}?parent=${sampleParent._id}`

    const emailPreviewData = {
      subject: emailTemplate.subject,
      body: emailTemplate.body,
      paymentAmount: sampleFee.amount,
      processingFee: sampleFee.processingFee,
      totalAmount: sampleFee.totalAmount,
      seasonName: season.name,
      dueDate: new Date(sampleFee.dueDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      stripePaymentLink: samplePaymentLink,
      facilityPaymentLink: facilityPaymentLink
    }

    return NextResponse.json({
      success: true,
      data: {
        emailPreview: emailPreviewData,
        sampleParent: {
          name: sampleParent.name,
          email: sampleParent.email
        },
        totalRecipients: parentIds.length
      }
    })

  } catch (error) {
    console.error('Error generating email template:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
