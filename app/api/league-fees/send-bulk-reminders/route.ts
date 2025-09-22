export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'

// Mock parents data for league fee reminders
const mockParents = [
  { _id: "j971g9n5ve0qqsby21a0k9n1js7n7tbx", name: "Kevin Houston", email: "khouston721@gmail.com", status: "active" },
  { _id: "j972g9n5ve0qqsby21a0k9n1js7n7tby", name: "Sarah Johnson", email: "sarah.johnson@email.com", status: "active" },
  { _id: "j973g9n5ve0qqsby21a0k9n1js7n7tbz", name: "Mike Davis", email: "mike.davis@email.com", status: "active" },
  { _id: "j974g9n5ve0qqsby21a0k9n1js7n7tc0", name: "Lisa Wilson", email: "lisa.wilson@email.com", status: "active" },
  { _id: "j975g9n5ve0qqsby21a0k9n1js7n7tc1", name: "Tom Brown", email: "tom.brown@email.com", status: "active" }
]

// Mock league fees data (this should match the data from the main route)
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

// Generate Stripe payment link for a parent
const generateStripePaymentLink = (parentId: string, feeId: string, amount: number) => {
  // This would normally integrate with Stripe's Payment Links API
  // For now, return a mock URL that includes the parent and fee information
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'
  return `${baseUrl}/pay/league-fee/${feeId}?parent=${parentId}&amount=${amount}`
}

// Generate AI-powered personalized email content
const generatePersonalizedEmail = async (parent: any, fee: any, paymentLink: string) => {
  const facilityPaymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'}/pay/facility/${fee._id}?parent=${parent._id}`
  
  // AI-generated personalized email content
  const emailContent = `
Subject: League Fee Payment Reminder - ${fee.season.name}

Dear ${parent.name},

I hope this message finds you well! This is a friendly reminder about your upcoming league fee payment for ${fee.season.name}.

**Payment Details:**
• Amount: $${fee.amount}
• Processing Fee: $${fee.processingFee}
• Total Amount: $${fee.totalAmount}
• Due Date: ${new Date(fee.dueDate).toLocaleDateString()}

**Payment Options:**

1. **Pay Online** (Recommended): 
   Click here to pay securely with your credit card: ${paymentLink}

2. **Pay at the Facility**: 
   If you prefer to pay in person, click here to confirm: ${facilityPaymentLink}
   (This will mark your fee as paid and stop future reminders)

We appreciate your continued support of the Rise as One basketball program. Your investment helps us provide the best possible experience for all our young athletes.

If you have any questions or concerns, please don't hesitate to reach out.

Best regards,
Kevin Houston
Rise as One Director
"A program built by hard working kids and realistic parents"

---
This is an automated reminder. If you have already paid, please disregard this message.
  `.trim()

  return emailContent
}

export async function POST(request: NextRequest) {
  try {
    const { seasonId, parentIds } = await request.json()

    if (!seasonId || !parentIds || !Array.isArray(parentIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: seasonId, parentIds (array)'
        },
        { status: 400 }
      )
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const parentId of parentIds) {
      try {
        // Find the parent
        const parent = mockParents.find(p => p._id === parentId)
        if (!parent) {
          results.push({
            parentId,
            status: 'error',
            error: 'Parent not found'
          })
          errorCount++
          continue
        }

        // Find or create league fee for this parent and season
        let fee = mockLeagueFees.find(f => f.parentId === parentId && f.seasonId === seasonId)
        
        if (!fee) {
          // Create a new fee if it doesn't exist
          const timestamp = Date.now()
          const feeId = `temp_fee_${timestamp}_${parentId}`
          
          fee = {
            _id: feeId,
            parentId: parentId,
            seasonId: seasonId,
            amount: 95,
            processingFee: 3.06,
            totalAmount: 98.06,
            paymentMethod: "online",
            status: "pending",
            dueDate: timestamp + (30 * 24 * 60 * 60 * 1000),
            remindersSent: 0,
            createdAt: timestamp,
            updatedAt: timestamp,
            season: {
              _id: seasonId,
              name: seasonId === "temp_season_1" ? "Summer League 2024" : "New Season",
              type: "summer_league",
              year: 2024
            },
            parent: parent
          }
          
          mockLeagueFees.push(fee)
        }

        // Generate personalized Stripe payment link
        const paymentLink = generateStripePaymentLink(parentId, fee._id, fee.totalAmount)

        // Generate AI-powered personalized email
        const emailContent = await generatePersonalizedEmail(parent, fee, paymentLink)

        // Here you would normally send the email using your email service
        // For now, we'll simulate the email sending
        console.log(`Sending email to ${parent.email}:`, emailContent)

        // Update reminder count
        fee.remindersSent = (fee.remindersSent || 0) + 1
        fee.updatedAt = Date.now()

        results.push({
          parentId,
          parentName: parent.name,
          parentEmail: parent.email,
          status: 'sent',
          paymentLink,
          emailContent: emailContent.substring(0, 200) + '...' // Truncated for response
        })
        successCount++

      } catch (error) {
        results.push({
          parentId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        errorCount++
      }
    }

    console.log('Bulk reminder emails processed:', {
      seasonId,
      totalRequested: parentIds.length,
      successCount,
      errorCount,
      results
    })

    return NextResponse.json({
      success: true,
      data: {
        sent: successCount,
        errors: errorCount,
        total: parentIds.length,
        results
      }
    })

  } catch (error) {
    console.error('Error sending bulk reminder emails:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
