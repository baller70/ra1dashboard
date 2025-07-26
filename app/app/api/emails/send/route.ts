import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { emailService } from '../../../../lib/resend'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const { type, to, data, parentId } = body

    if (!type || !to) {
      return NextResponse.json(
        { error: 'Email type and recipient are required' },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case 'payment_reminder':
        const { parentName, studentName, amount, dueDate } = data
        if (!parentName || !studentName || !amount || !dueDate) {
          return NextResponse.json(
            { error: 'Missing required data for payment reminder' },
            { status: 400 }
          )
        }
        result = await emailService.sendPaymentReminder(to, parentName, studentName, amount, dueDate, parentId)
        break

      case 'overdue_notice':
        const { parentName: parentNameOverdue, studentName: studentNameOverdue, amount: amountOverdue, daysPastDue } = data
        if (!parentNameOverdue || !studentNameOverdue || !amountOverdue || daysPastDue === undefined) {
          return NextResponse.json(
            { error: 'Missing required data for overdue notice' },
            { status: 400 }
          )
        }
        result = await emailService.sendOverdueNotice(to, parentNameOverdue, studentNameOverdue, amountOverdue, daysPastDue, parentId)
        break

      case 'payment_confirmation':
        const { parentName: parentNameConfirm, studentName: studentNameConfirm, amount: amountConfirm, paymentDate, paymentMethod } = data
        if (!parentNameConfirm || !studentNameConfirm || !amountConfirm || !paymentDate) {
          return NextResponse.json(
            { error: 'Missing required data for payment confirmation' },
            { status: 400 }
          )
        }
        result = await emailService.sendPaymentConfirmation(to, parentNameConfirm, studentNameConfirm, amountConfirm, paymentDate, paymentMethod, parentId)
        break

      case 'custom':
        const { subject, htmlContent, from } = data
        if (!subject || !htmlContent) {
          return NextResponse.json(
            { error: 'Subject and HTML content are required for custom emails' },
            { status: 400 }
          )
        }
        result = await emailService.sendCustomEmail(to, subject, htmlContent, from, parentId)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    // Log the email send in Convex (optional)
    try {
      // You can add a message log here if needed
      // await convex.mutation(api.messages.logEmailSent, {
      //   to,
      //   type,
      //   sentAt: Date.now(),
      //   success: true
      // })
    } catch (logError) {
      console.error('Failed to log email send:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      data: result.data
    })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
} 