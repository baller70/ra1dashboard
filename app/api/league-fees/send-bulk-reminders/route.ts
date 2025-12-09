export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
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

// Initialize Resend
function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === 'placeholder-key-for-build' || apiKey === 're_placeholder_key_for_testing') {
    console.warn('RESEND_API_KEY not configured - email sending will be simulated')
    return null
  }
  return new Resend(apiKey)
}

// Using real data from Convex; mock lists removed.
// Generate actual Stripe payment link for a parent
const generateStripePaymentLink = async (parent: any, fee: any) => {
  const stripe = getStripe()

  if (!stripe) {
    // Fallback to local payment page if Stripe is not configured
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'
    return `${baseUrl}/pay/league-fee/${fee._id}?parent=${parent._id}&amount=${fee.totalAmount}`
  }

  try {
    // Create or get Stripe customer for the parent
    let customerId = parent.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: parent.name,
        email: parent.email,
        metadata: {
          parentId: parent._id,
          source: 'ra1_league_fees'
        }
      })
      customerId = customer.id
      // Note: In a real implementation, you'd update the parent record with the customerId
    }

    // Create a product for the league fee
    const product = await stripe.products.create({
      name: `${fee.season.name} - League Fee`,
      description: `League fee payment for ${fee.season.name}`,
      metadata: {
        leagueFeeId: fee._id,
        parentId: parent._id,
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
        parentId: parent._id,
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
        parentId: parent._id,
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
    return `${baseUrl}/pay/league-fee/${fee._id}?parent=${parent._id}&amount=${fee.totalAmount}`
  }
}

// Generate AI-powered personalized email content
const generatePersonalizedEmail = async (parent: any, fee: any, paymentLink: string) => {
  const facilityPaymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'}/pay/facility/${fee._id}?parent=${parent._id}`

  // AI-generated personalized email content (no emergency contact in body)
  const firstName = (parent?.name || '').trim().split(/\s+/)[0] || 'there'
  const emailContent = `
Subject: League Fee Payment Reminder - ${fee.season.name}

Dear ${firstName},

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
    const { seasonId, parentIds, customSubject, customBody } = await request.json()

    if (!seasonId || !parentIds || !Array.isArray(parentIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: seasonId, parentIds (array)'
        },
        { status: 400 }
      )
    }

    // Enforce email configuration per environment variables
    const resend = getResend()
    const fromAddress = process.env.RESEND_FROM_EMAIL
    if (!resend || !fromAddress) {
      return NextResponse.json(
        { success: false, error: 'Resend not configured: ensure RESEND_API_KEY and RESEND_FROM_EMAIL are set' },
        { status: 500 }
      )
    }
    // Extract bare email from env (supports both "Name <email@domain>" and plain email)
    const match = /<([^>]+)>/.exec(fromAddress)
    const baseFromEmail = match ? match[1] : fromAddress

    // Fetch season details once
    const season = await (convexHttp as any).query(api.seasons.getSeason as any, { id: seasonId as any })
    if (!season) {
      return NextResponse.json(
        { success: false, error: 'Season not found' },
        { status: 404 }
      )
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const parentId of parentIds) {
      try {
        // Fetch parent from Convex
        const parent = await (convexHttp as any).query(api.parents.getParent as any, { id: parentId as any })
        if (!parent) {
          results.push({ parentId, status: 'error', error: 'Parent not found' })
          errorCount++
          continue
        }

        // Ensure a real league fee exists for this parent+season
        const existingFees = await (convexHttp as any).query(api.leagueFees.getLeagueFeesBySeason as any, { seasonId: seasonId as any })
        let feeRecord = (existingFees || []).find((f: any) => String(f.parentId) === String(parentId))
        if (!feeRecord) {
          try {
            const insertedId = await (convexHttp as any).mutation(api.leagueFees.createLeagueFee as any, {
              seasonId: seasonId as any,
              parentId: parentId as any,
              paymentMethod: 'online'
            })
            // Re-query to get full record after insert
            const freshFees = await (convexHttp as any).query(api.leagueFees.getLeagueFeesBySeason as any, { seasonId: seasonId as any })
            feeRecord = (freshFees || []).find((f: any) => String(f._id) === String(insertedId)) || (freshFees || []).find((f: any) => String(f.parentId) === String(parentId))
          } catch (e) {
            console.error('Failed to create league fee:', e)
          }
        }

        // Build a fee model based on the real record (fallback to defaults if missing)
        const timestamp = Date.now()
        const fee = {
          _id: feeRecord?._id || `temp_fee_${timestamp}_${parentId}`,
          parentId,
          seasonId,
          amount: feeRecord?.amount ?? 95,
          processingFee: feeRecord?.processingFee ?? 3.06,
          totalAmount: feeRecord?.totalAmount ?? 98.06,
          paymentMethod: feeRecord?.paymentMethod ?? 'online',
          status: feeRecord?.status ?? 'pending',
          dueDate: feeRecord?.dueDate ?? (timestamp + (30 * 24 * 60 * 60 * 1000)),
          remindersSent: feeRecord?.remindersSent ?? 0,
          createdAt: feeRecord?.createdAt ?? timestamp,
          updatedAt: timestamp,
          season,
          parent
        }

        // Generate personalized Stripe payment link
        const paymentLink = await generateStripePaymentLink(parent, fee)

        // Generate email content (use custom content if provided, otherwise generate AI content)
        let emailContent
        if (customSubject && customBody) {
          // Use custom subject and body from email preview
          // Replace placeholders with actual parent data for personalization
          const firstName = (parent?.name || '').trim().split(/\s+/)[0] || 'there'
          const facilityPaymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'}/pay/facility/${fee._id}?parent=${parent._id}`

          // Replace common placeholders in subject and body
          const personalizedSubject = customSubject
            .replace(/\{firstName\}/gi, firstName)
            .replace(/\{name\}/gi, parent?.name || 'Parent')
            .replace(/\{amount\}/gi, String(fee.totalAmount))
            .replace(/\{seasonName\}/gi, fee.season?.name || '')

          const personalizedBody = customBody
            .replace(/\{firstName\}/gi, firstName)
            .replace(/\{name\}/gi, parent?.name || 'Parent')
            .replace(/\{amount\}/gi, String(fee.totalAmount))
            .replace(/\{processingFee\}/gi, String(fee.processingFee))
            .replace(/\{baseAmount\}/gi, String(fee.amount))
            .replace(/\{seasonName\}/gi, fee.season?.name || '')
            .replace(/\{dueDate\}/gi, new Date(fee.dueDate).toLocaleDateString())
            .replace(/\{paymentLink\}/gi, paymentLink)
            .replace(/\{facilityPaymentLink\}/gi, facilityPaymentLink)
            // Also replace the first occurrence of a generic greeting with personalized one
            .replace(/Dear Parent,/gi, `Dear ${firstName},`)
            .replace(/Dear there,/gi, `Dear ${firstName},`)
            .replace(/Hi Parent,/gi, `Hi ${firstName},`)
            .replace(/Hello Parent,/gi, `Hello ${firstName},`)

          emailContent = `Subject: ${personalizedSubject}\n\n${personalizedBody}`
        } else {
          // Generate AI-powered personalized email (returns full content including Subject line)
          emailContent = await generatePersonalizedEmail(parent, fee, paymentLink)
        }

        // Send the actual email using Resend
        const resend = getResend()
        let emailSent = false
        let emailError = null

        if (resend && parent.email) {
          try {
            // Parse the email content to extract subject and body
            const emailLines = emailContent.split('\n')
            const subjectLine = emailLines.find(line => line.startsWith('Subject:'))
            const subject = subjectLine ? subjectLine.replace('Subject:', '').trim() : `League Fee Payment Reminder - ${fee.season.name}`

            // Get the body (everything after the subject line)
            const subjectIndex = emailLines.findIndex(line => line.startsWith('Subject:'))
            const body = subjectIndex >= 0 ? emailLines.slice(subjectIndex + 1).join('\n').trim() : emailContent

            // Send email via Resend
            let messageId: string | null = null
            let usedFallback = false
            const displayName = (parent.emergencyContact || 'RA1 Basketball').replace(/[<>]/g, '')
            const dynamicFrom = `${displayName} <${baseFromEmail}>`
            const replyTo = (parent.emergencyEmail || parent.parentEmail || parent.email || '').toString()
            const result = await resend.emails.send({
              from: dynamicFrom,
              to: [parent.email],
              subject,
              text: body,
              html: body.replace(/\n/g, '<br>'), // Simple HTML conversion
              reply_to: replyTo ? [replyTo] : undefined
            })

            if (result.error) {
              // Do not fallback. Surface exact Resend error; user requires using their configured sender only.
              emailError = result.error
              console.error(`Failed to send email to ${parent.email}:`, result.error)
            } else {
              emailSent = true
              messageId = (result as any).data?.id ?? null
              console.log(`✅ Email successfully sent to ${parent.email}:`, (result as any).data)
            }
          } catch (error) {
            emailError = error
            console.error(`Error sending email to ${parent.email}:`, error)
          }
        } else {
          console.log(`📧 Simulating email to ${parent.email} (Resend not configured):`, emailContent)
          emailSent = true // Simulate success for development
        }

        // Persist reminder counters when successful
        if (emailSent && fee?._id && !String(fee._id).startsWith('temp_fee_')) {
          try {
            await (convexHttp as any).mutation(api.leagueFees.incrementReminderCount as any, { id: fee._id as any })
          } catch (e) {
            console.warn('Non-fatal: failed to increment reminder count for fee', fee._id, e)
          }
        }

        // Update results based on email sending status
        if (emailSent) {
          results.push({
            parentId,
            parentName: parent.name,
            parentEmail: parent.email,
            status: 'sent',
            paymentLink,
            emailContent: emailContent.substring(0, 200) + '...', // Truncated for response
            emailId: typeof messageId === 'string' ? messageId : undefined,
            usedFallback: typeof usedFallback !== 'undefined' ? usedFallback : false
          })
          successCount++
        } else {
          results.push({
            parentId,
            parentName: parent.name,
            parentEmail: parent.email,
            status: 'error',
            error: emailError ? (emailError instanceof Error ? emailError.message : (typeof emailError === 'string' ? emailError : JSON.stringify(emailError))) : 'Failed to send email',
            paymentLink,
            emailContent: emailContent.substring(0, 200) + '...', // Truncated for response
            usedFallback: false
          })
          errorCount++
        }

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
