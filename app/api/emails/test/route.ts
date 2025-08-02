import { NextResponse } from 'next/server'
import { emailService } from '../../../../lib/resend'

export async function POST(request: Request) {
  try {
    // Debug environment variables
    console.log('=== EMAIL TEST DEBUG ===')
    console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)
    console.log('RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length || 0)
    console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL)
    console.log('NODE_ENV:', process.env.NODE_ENV)

    const body = await request.json()
    const { to, testType = 'payment_reminder' } = body

    console.log('Test request:', { to, testType })

    if (!to) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Validate environment variables
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is missing from environment variables')
      return NextResponse.json(
        { 
          error: 'Server configuration error: RESEND_API_KEY is missing',
          details: 'Please check your environment variables'
        },
        { status: 500 }
      )
    }

    let result

    console.log(`Attempting to send ${testType} email to ${to}`)

    switch (testType) {
      case 'payment_reminder':
        result = await emailService.sendPaymentReminder(
          to,
          'John Doe', // parentName
          'Alex Doe', // studentName
          150, // amount
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() // dueDate (7 days from now)
        )
        break

      case 'overdue_notice':
        result = await emailService.sendOverdueNotice(
          to,
          'Jane Smith', // parentName
          'Sam Smith', // studentName
          200, // amount
          5 // daysPastDue
        )
        break

      case 'payment_confirmation':
        result = await emailService.sendPaymentConfirmation(
          to,
          'Mike Johnson', // parentName
          'Emma Johnson', // studentName
          175, // amount
          new Date().toLocaleDateString(), // paymentDate
          'Credit Card' // paymentMethod
        )
        break

      default:
        return NextResponse.json(
          { error: 'Invalid test type' },
          { status: 400 }
        )
    }

    console.log('Email send result:', result)

    return NextResponse.json({
      success: true,
      message: `Test ${testType} email sent successfully to ${to}`,
      messageId: result.data?.id,
      testData: {
        testType,
        to,
        timestamp: new Date().toISOString(),
        from: process.env.RESEND_FROM_EMAIL || 'RA1 Basketball <onboarding@resend.dev>'
      }
    })

  } catch (error) {
    console.error('=== EMAIL TEST ERROR ===')
    console.error('Error details:', error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Check if it's a Resend API error
    if (error && typeof error === 'object' && 'message' in error) {
      const resendError = error as any
      console.error('Resend error details:', {
        message: resendError.message,
        name: resendError.name,
        status: resendError.status,
        response: resendError.response
      })
    }

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error && 'response' in error 
      ? (error as any).response?.data 
      : null

    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: errorMessage,
        debugInfo: errorDetails,
        environmentCheck: {
          hasResendApiKey: !!process.env.RESEND_API_KEY,
          resendFromEmail: process.env.RESEND_FROM_EMAIL,
          nodeEnv: process.env.NODE_ENV
        }
      },
      { status: 500 }
    )
  }
} 