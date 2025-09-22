export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'

// Mock parents data
const mockParents = [
  { _id: "j971g9n5ve0qqsby21a0k9n1js7n7tbx", name: "Kevin Houston", email: "khouston721@gmail.com", status: "active" },
  { _id: "j972g9n5ve0qqsby21a0k9n1js7n7tby", name: "Sarah Johnson", email: "sarah.johnson@email.com", status: "active" },
  { _id: "j973g9n5ve0qqsby21a0k9n1js7n7tbz", name: "Mike Davis", email: "mike.davis@email.com", status: "active" },
  { _id: "j974g9n5ve0qqsby21a0k9n1js7n7tc0", name: "Lisa Wilson", email: "lisa.wilson@email.com", status: "active" },
  { _id: "j975g9n5ve0qqsby21a0k9n1js7n7tc1", name: "Tom Brown", email: "tom.brown@email.com", status: "active" }
]

// Mock league fees data (should be shared with main route)
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
    lastReminderSent: null,
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'
  return `${baseUrl}/pay/league-fee/${feeId}?parent=${parentId}&amount=${amount}`
}

// Generate AI-powered personalized reminder email
const generateReminderEmail = async (parent: any, fee: any, paymentLink: string, reminderType: string) => {
  const facilityPaymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'}/pay/facility/${fee._id}?parent=${parent._id}`
  
  let subject = ''
  let urgencyMessage = ''
  
  const daysUntilDue = Math.ceil((fee.dueDate - Date.now()) / (24 * 60 * 60 * 1000))
  
  switch (reminderType) {
    case 'initial':
      subject = `League Fee Payment Reminder - ${fee.season.name}`
      urgencyMessage = `Your league fee payment is due in ${daysUntilDue} days.`
      break
    case 'followup':
      subject = `Follow-up: League Fee Payment - ${fee.season.name}`
      urgencyMessage = daysUntilDue > 0 
        ? `Just a friendly follow-up - your payment is due in ${daysUntilDue} days.`
        : `Your payment was due ${Math.abs(daysUntilDue)} days ago. Please pay as soon as possible.`
      break
    case 'urgent':
      subject = `URGENT: Overdue League Fee - ${fee.season.name}`
      urgencyMessage = `Your league fee payment is now ${Math.abs(daysUntilDue)} days overdue. Please pay immediately to avoid any issues.`
      break
    default:
      subject = `League Fee Payment Reminder - ${fee.season.name}`
      urgencyMessage = `Your league fee payment is due soon.`
  }

  const emailContent = `
Subject: ${subject}

Dear ${parent.name},

${urgencyMessage}

**Payment Details:**
• Amount: $${fee.amount}
• Processing Fee: $${fee.processingFee}
• Total Amount: $${fee.totalAmount}
• Due Date: ${new Date(fee.dueDate).toLocaleDateString()}
• Reminders Sent: ${fee.remindersSent + 1}

**Quick Payment Options:**

1. **Pay Online Now**: ${paymentLink}
   (Secure credit card payment through Stripe)

2. **Pay at Facility**: ${facilityPaymentLink}
   (Click to confirm facility payment - stops all reminders)

${reminderType === 'urgent' ? 
  'Please note: Continued non-payment may affect your child\'s participation in future programs.' : 
  'Thank you for your continued support of the Rise as One basketball program!'
}

Best regards,
Kevin Houston
Rise as One Director
"A program built by hard working kids and realistic parents"

---
This is an automated reminder. If you have already paid, please disregard this message.
  `.trim()

  return emailContent
}

// Check which fees need reminders and send them
export async function POST(request: NextRequest) {
  try {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    const threeDaysMs = 3 * oneDayMs
    const sevenDaysMs = 7 * oneDayMs
    
    const results = []
    let sentCount = 0

    // Find all pending fees that need reminders
    const pendingFees = mockLeagueFees.filter(fee => fee.status === 'pending')

    for (const fee of pendingFees) {
      const parent = mockParents.find(p => p._id === fee.parentId)
      if (!parent) continue

      const daysUntilDue = Math.ceil((fee.dueDate - now) / oneDayMs)
      const daysSinceLastReminder = fee.lastReminderSent 
        ? Math.ceil((now - fee.lastReminderSent) / oneDayMs)
        : Infinity

      let shouldSendReminder = false
      let reminderType = 'followup'

      // Determine if we should send a reminder based on various conditions
      if (fee.remindersSent === 0) {
        // First reminder: 7 days before due date
        if (daysUntilDue <= 7) {
          shouldSendReminder = true
          reminderType = 'initial'
        }
      } else if (daysUntilDue > 0) {
        // Follow-up reminders: every 3 days until due date
        if (daysSinceLastReminder >= 3) {
          shouldSendReminder = true
          reminderType = 'followup'
        }
      } else {
        // Overdue reminders: every 2 days after due date
        if (daysSinceLastReminder >= 2) {
          shouldSendReminder = true
          reminderType = 'urgent'
        }
      }

      if (shouldSendReminder) {
        try {
          // Generate payment link
          const paymentLink = generateStripePaymentLink(parent._id, fee._id, fee.totalAmount)

          // Generate personalized email
          const emailContent = await generateReminderEmail(parent, fee, paymentLink, reminderType)

          // Here you would normally send the email using your email service
          console.log(`Auto-sending ${reminderType} reminder to ${parent.email}:`, emailContent.substring(0, 200) + '...')

          // Update reminder tracking
          fee.remindersSent = (fee.remindersSent || 0) + 1
          fee.lastReminderSent = now
          fee.updatedAt = now

          results.push({
            feeId: fee._id,
            parentName: parent.name,
            parentEmail: parent.email,
            reminderType,
            daysUntilDue,
            reminderCount: fee.remindersSent,
            status: 'sent'
          })
          sentCount++

        } catch (error) {
          results.push({
            feeId: fee._id,
            parentName: parent.name,
            parentEmail: parent.email,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    console.log('Auto-reminder job completed:', {
      totalPendingFees: pendingFees.length,
      remindersSent: sentCount,
      timestamp: new Date().toISOString(),
      results
    })

    return NextResponse.json({
      success: true,
      data: {
        processed: pendingFees.length,
        sent: sentCount,
        results
      }
    })

  } catch (error) {
    console.error('Error in auto-reminder job:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check reminder status
export async function GET(request: NextRequest) {
  try {
    const pendingFees = mockLeagueFees.filter(fee => fee.status === 'pending')
    const now = Date.now()
    
    const reminderStats = pendingFees.map(fee => {
      const daysUntilDue = Math.ceil((fee.dueDate - now) / (24 * 60 * 60 * 1000))
      const daysSinceLastReminder = fee.lastReminderSent 
        ? Math.ceil((now - fee.lastReminderSent) / (24 * 60 * 60 * 1000))
        : null

      return {
        feeId: fee._id,
        parentName: fee.parent.name,
        seasonName: fee.season.name,
        daysUntilDue,
        remindersSent: fee.remindersSent || 0,
        lastReminderSent: fee.lastReminderSent ? new Date(fee.lastReminderSent).toISOString() : null,
        daysSinceLastReminder,
        status: fee.status
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        totalPendingFees: pendingFees.length,
        reminderStats
      }
    })

  } catch (error) {
    console.error('Error fetching reminder stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
