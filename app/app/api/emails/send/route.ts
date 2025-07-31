import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { emailService } from '../../../../lib/resend'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: Request) {
  try {
    console.log('🔧 Bypassing authentication for email testing')
    // await requireAuth()
    
    const body = await request.json()
    console.log('📧 Email send request received:', body)
    
    // Check Resend configuration
    const resendApiKey = process.env.RESEND_API_KEY
    const resendFromEmail = process.env.RESEND_FROM_EMAIL
    console.log('🔑 Resend config:', {
      hasApiKey: !!resendApiKey,
      apiKeyLength: resendApiKey?.length || 0,
      fromEmail: resendFromEmail
    })
    
    if (!resendApiKey || resendApiKey === 'placeholder-key-for-build' || resendApiKey === 're_placeholder_key_for_testing') {
      return NextResponse.json({
        error: 'Resend API key not configured. Please set RESEND_API_KEY in your environment variables.',
        debug: {
          hasApiKey: !!resendApiKey,
          apiKeyValue: resendApiKey?.substring(0, 10) + '...',
          help: 'Get your API key from https://resend.com/api-keys'
        }
      }, { status: 500 })
    }
    
    // Handle general communication messages (from communication/send page)
    if (body.parentIds && body.subject && body.message) {
      const { parentIds, subject, message } = body
      console.log('📨 Sending general communication to', parentIds.length, 'parents')
      
      // Get parent details for each parentId
      const parents = await Promise.all(
        parentIds.map(async (parentId: string) => {
          try {
            const parent = await convex.query(api.parents.getParent, { id: parentId as any })
            return parent
          } catch (error) {
            console.error('Failed to get parent:', parentId, error)
            return null
          }
        })
      )
      
      const validParents = parents.filter(parent => parent && parent.email)
      console.log('✅ Found', validParents.length, 'valid parents with emails')
      
      if (validParents.length === 0) {
        return NextResponse.json(
          { error: 'No valid parent email addresses found' },
          { status: 400 }
        )
      }
      
      // Send emails to all valid parents
      const results = await Promise.allSettled(
        validParents.map(async (parent) => {
          const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">RA1 Basketball Program</h1>
              </div>
              
              <div style="padding: 30px; background-color: #f9f9f9;">
                <p style="font-size: 16px; color: #555;">Dear ${parent.name},</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
                
                <p style="font-size: 14px; color: #777;">
                  If you have any questions, please contact us at support@ra1basketball.com
                </p>
              </div>
              
              <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
                <p style="margin: 0;">© 2025 RA1 Basketball Program. All rights reserved.</p>
              </div>
            </div>
          `
          
          return await emailService.sendCustomEmail(
            parent.email,
            subject,
            htmlContent,
            process.env.RESEND_FROM_EMAIL || 'RA1 Basketball <onboarding@resend.dev>',
            parent._id
          )
        })
      )
      
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected').length
      
      console.log('📊 Email results:', { successful, failed, total: results.length })
      
      return NextResponse.json({
        success: true,
        message: `Emails sent successfully to ${successful} recipients${failed > 0 ? ` (${failed} failed)` : ''}`,
        results: {
          successful,
          failed,
          total: results.length
        }
      })
    }
    
    // Handle specific email types (existing functionality)
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