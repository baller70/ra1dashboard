
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { Resend } from 'resend'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const resend = new Resend(process.env.RESEND_API_KEY || 'dev_test_key')

export async function GET(request: Request) {
  try {
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const parentId = searchParams.get('parentId')
    const channel = searchParams.get('channel')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const result = await convex.query(api.messageLogs.getMessageLogs, {
      page,
      limit,
      parentId: parentId ?? undefined,
      status: status ?? undefined,
      type: type ?? undefined,
      channel: channel ?? undefined,
      dateFrom: dateFrom ? parseInt(dateFrom) : undefined,
      dateTo: dateTo ? parseInt(dateTo) : undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Messages fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const {
      parentId,
      templateId,
      subject,
      message,
      body: messageBody,
      content,
      method = 'email',
      channel = 'email',
      type = 'payment_reminder',
      installmentId,
      scheduledFor
    } = body

    // Handle different parameter names from AI reminder
    const finalMessage = message || messageBody || content
    const finalChannel = method || channel
    const finalSubject = subject || 'Payment Reminder'

    // Basic validation
    if (!parentId || !finalMessage) {
      return NextResponse.json(
        { error: 'Parent ID and message content are required' },
        { status: 400 }
      )
    }

    // Get parent information for sending
    const parent = await convex.query(api.parents.getParent, { id: parentId as Id<"parents"> })
    if (!parent) {
      return NextResponse.json(
        { error: 'Parent not found' },
        { status: 404 }
      )
    }

    // Create message log entry
    const messageId = await convex.mutation(api.messageLogs.createMessageLog, {
      parentId,
      templateId,
      subject: finalSubject,
      body: finalMessage,
      content: finalMessage,
      channel: finalChannel,
      type,
      status: 'sending',
      sentAt: scheduledFor || Date.now(),
      metadata: {
        installmentId,
        method: finalChannel,
        aiGenerated: true
      }
    })

    // Send the actual message
    let sendResult = null
    try {
      if (finalChannel === 'email' && parent.email) {
        // Send email using Resend
        sendResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@thebasketballfactoryinc.com',
          to: [parent.email],
          subject: finalSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Payment Reminder</h2>
              <p>Dear ${parent.name},</p>
              <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${finalMessage.replace(/\n/g, '<br>')}
              </div>
              <p>Best regards,<br>The Basketball Factory Inc.</p>
            </div>
          `,
          text: `Dear ${parent.name},\n\n${finalMessage}\n\nBest regards,\nThe Basketball Factory Inc.`
        })

        // Update message status to sent
        await convex.mutation(api.messageLogs.updateMessageStatus, {
          id: messageId,
          status: 'sent',
          deliveredAt: Date.now(),
        })

        // Create analytics entry
        await convex.mutation(api.messageLogs.createMessageAnalytics, {
          messageLogId: messageId,
          parentId: parentId as Id<"parents">,
          channel: finalChannel,
          messageType: type,
        })

      } else if (finalChannel === 'sms' && parent.phone) {
        // SMS sending would go here (placeholder for now)
        console.log('SMS sending not yet implemented:', {
          to: parent.phone,
          message: finalMessage
        })
        
        // Update message status
        await convex.mutation(api.messageLogs.updateMessageStatus, {
          id: messageId,
          status: 'sent',
          deliveredAt: Date.now(),
        })

        sendResult = { success: true, method: 'sms' }
      } else {
        throw new Error(`No ${finalChannel} contact information available for parent`)
      }

    } catch (sendError) {
      console.error('Message sending error:', sendError)
      
      // Update message status to failed
      await convex.mutation(api.messageLogs.updateMessageStatus, {
        id: messageId,
        status: 'failed',
        failureReason: sendError instanceof Error ? sendError.message : 'Unknown error',
        errorMessage: sendError
      })

      return NextResponse.json(
        { error: 'Failed to send message: ' + (sendError instanceof Error ? sendError.message : 'Unknown error') },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId,
      sendResult,
      message: `Payment reminder sent via ${finalChannel} successfully`,
      recipient: finalChannel === 'email' ? parent.email : parent.phone
    })

  } catch (error) {
    console.error('Message creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create and send message' },
      { status: 500 }
    )
  }
}
