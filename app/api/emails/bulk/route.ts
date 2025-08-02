import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { emailService } from '../../../../lib/resend'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

interface EmailResult {
  to: string
  messageId?: string
  status: 'sent' | 'failed'
  error?: string
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const { type, recipients, data } = body

    if (!type || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Email type and recipients array are required' },
        { status: 400 }
      )
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[]
    }

    // Process each recipient
    for (const recipient of recipients) {
      const { to, parentId } = typeof recipient === 'string' ? { to: recipient, parentId: undefined } : recipient
      
      try {
        let result

        switch (type) {
          case 'payment_reminder':
            const { parentName, studentName, amount, dueDate } = data
            result = await emailService.sendPaymentReminder(to, parentName, studentName, amount, dueDate, parentId)
            break

          case 'overdue_notice':
            const { parentName: parentNameOverdue, studentName: studentNameOverdue, amount: amountOverdue, daysPastDue } = data
            result = await emailService.sendOverdueNotice(to, parentNameOverdue, studentNameOverdue, amountOverdue, daysPastDue, parentId)
            break

          case 'custom':
            const { subject, htmlContent, from } = data
            result = await emailService.sendCustomEmail(to, subject, htmlContent, from, parentId)
            break

          default:
            throw new Error('Invalid email type')
        }

        results.successful.push({
          to,
          parentId,
          messageId: result.messageId,
          resendId: result.data?.id,
          status: 'sent'
        })

      } catch (error) {
        console.error(`Failed to send email to ${to}:`, error)
        results.failed.push({
          to,
          parentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log bulk email operation
    try {
      // You can add bulk email logging here if needed
      console.log(`Bulk email operation completed: ${results.successful.length} successful, ${results.failed.length} failed`)
    } catch (logError) {
      console.error('Failed to log bulk email operation:', logError)
    }

    return NextResponse.json({
      success: true,
      message: `Bulk email operation completed: ${results.successful.length}/${recipients.length} emails sent successfully`,
      results
    })

  } catch (error) {
    console.error('Error in bulk email operation:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk email operation' },
      { status: 500 }
    )
  }
} 