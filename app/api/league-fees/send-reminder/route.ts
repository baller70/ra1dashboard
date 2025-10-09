export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import Stripe from 'stripe'
import { Resend } from 'resend'

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured')
  return new ConvexHttpClient(url)
}

function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return null
  return new Stripe(secret, { apiVersion: '2024-06-20' } as any)
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

const getBaseUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'

export async function POST(request: NextRequest) {
  try {
    const { leagueFeeId, parentId } = await request.json()

    if (!leagueFeeId || !parentId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: leagueFeeId, parentId' 
        },
        { status: 400 }
      )
    }

    // Try mock first when using temp fee ids to avoid Convex issues in serverless
    let fee: any = null
    let parent: any = null
    let season: any = null
    try {
      const idStr = String(leagueFeeId)
      if (idStr.startsWith('temp_fee_')) {
        const { mockLeagueFees } = await import('@/app/api/league-fees/route')
        const mock = mockLeagueFees.find((f: any) => f._id === leagueFeeId && f.parentId === parentId)
        if (mock) {
          fee = mock
          parent = mock.parent
          season = mock.season
        }
      }
    } catch (e) {
      // ignore import errors
    }

    // Load from Convex if not resolved via mock
    if (!fee || !parent) {
      const convex = getConvexClient()
      fee = await convex.query(api.leagueFees.getLeagueFee, { id: leagueFeeId as any })
      parent = await convex.query(api.parents.getParent, { id: parentId as any })
      season = fee?.seasonId ? await convex.query(api.seasons.getSeason, { id: fee.seasonId as any }) : null
    }

    // Fallback to mock as last resort
    if (!fee || !parent) {
      try {
        const { mockLeagueFees } = await import('@/app/api/league-fees/route')
        const mock = mockLeagueFees.find((f: any) => f._id === leagueFeeId && f.parentId === parentId)
        if (mock) {
          fee = mock
          parent = mock.parent
          season = mock.season
        }
      } catch (e) {
        // ignore import errors
      }
    }

    if (!fee || !parent) {
      return NextResponse.json(
        { success: false, error: 'Fee or Parent not found' },
        { status: 404 }
      )
    }

    // Build Stripe payment link (fallback to local payment page if Stripe not configured)
    const stripe = getStripe()
    let paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || (new URL(request.url)).origin}/pay/league-fee/${fee._id}?parent=${parent._id}&amount=${fee.totalAmount}`

    if (stripe) {
      try {
        const product = await stripe.products.create({
          name: `League Fee - ${season?.name || 'Season'} (${parent.name})`,
          metadata: {
            leagueFeeId: String(fee._id),
            parentId: String(parent._id),
            seasonId: String(fee.seasonId || ''),
          },
        })
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round((fee.totalAmount || fee.amount) * 100),
          currency: 'usd',
          metadata: {
            leagueFeeId: String(fee._id),
            parentId: String(parent._id),
            seasonId: String(fee.seasonId || ''),
          },
        })
        const link = await stripe.paymentLinks.create({
          line_items: [{ price: price.id, quantity: 1 }],
          metadata: {
            leagueFeeId: String(fee._id),
            parentId: String(parent._id),
            seasonId: String(fee.seasonId || ''),
            source: 'league_fee_payment',
          },
          after_completion: {
            type: 'redirect',
            redirect: {
              url: `${process.env.NEXT_PUBLIC_APP_URL || (new URL(request.url)).origin}/payments/success?fee=${fee._id}`,
            },
          },
        })
        paymentLink = link.url
      } catch (err) {
        console.warn('Stripe link creation failed, using fallback link:', err)
      }
    }

    // Compose branded HTML
    const subject = `League Fee Payment Reminder - ${season?.name || 'Season'}`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f9fafb; padding: 24px;">
        <div style="background: linear-gradient(135deg, #111827, #1f2937); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 20px; letter-spacing: .5px;">RA1 Basketball</h1>
        </div>
        <div style="background: #ffffff; padding: 28px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #111827; margin: 0 0 12px;">Dear ${parent.name},</p>
          <p style="font-size: 15px; color: #374151; margin: 0 0 16px;">
            This is a friendly reminder about your league fee for <strong>${season?.name || 'the season'}</strong>.
          </p>
          <div style="background: #f9fafb; padding: 16px; border-left: 4px solid #2563eb; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 6px 0; color:#111827;"><strong>Amount:</strong> $${(fee.amount ?? fee.totalAmount).toFixed ? (fee.amount ?? fee.totalAmount).toFixed(2) : fee.amount ?? fee.totalAmount}</p>
            ${fee.processingFee ? `<p style=\"margin: 6px 0; color:#111827;\"><strong>Processing Fee:</strong> $${fee.processingFee.toFixed ? fee.processingFee.toFixed(2) : fee.processingFee}</p>` : ''}
            <p style="margin: 6px 0; color:#111827;"><strong>Total:</strong> $${(fee.totalAmount || fee.amount).toFixed ? (fee.totalAmount || fee.amount).toFixed(2) : (fee.totalAmount || fee.amount)}</p>
            <p style="margin: 6px 0; color:#111827;"><strong>Due Date:</strong> ${new Date(fee.dueDate).toLocaleDateString()}</p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${paymentLink}" style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block;margin:0 6px 8px;">Pay Online</a>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || (new URL(request.url)).origin}/pay/facility/${fee._id}?parent=${parent._id}" style="background:#111827;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block;margin:0 6px 8px;">Pay at Facility</a>
          </div>
          <p style="font-size: 14px; color: #374151; margin: 0;">Thank you!<br/>RA1 Basketball</p>
        </div>
      </div>`

    // Prepare plain text fallback
    const text = `Dear ${parent.name},\n\nThis is a friendly reminder about your league fee for ${season?.name || 'the season'}.\n\nAmount: $${fee.amount}\n${fee.processingFee ? `Processing Fee: $${fee.processingFee}\n` : ''}Total: $${fee.totalAmount || fee.amount}\nDue Date: ${new Date(fee.dueDate).toLocaleDateString()}\n\nPay Online: ${paymentLink}\nPay at Facility: ${process.env.NEXT_PUBLIC_APP_URL || (new URL(request.url)).origin}/pay/facility/${fee._id}?parent=${parent._id}\n\nThank you!\nRA1 Basketball`;

    // Send email via Resend
    const resend = getResend()
    if (!resend) {
      console.warn('RESEND_API_KEY not configured - attempting simulated send for dev, or failing in prod')
    }

    const fromAddress = process.env.RESEND_FROM_EMAIL || 'RA1 Basketball <onboarding@resend.dev>'

    // Create message log (best-effort)
    const convex = getConvexClient()
    let messageLogId: any = null
    try {
      messageLogId = await convex.mutation(api.messageLogs.createMessageLog, {
        parentId: parent._id as any,
        subject,
        body: text,
        content: html,
        channel: 'email',
        type: 'league_fee_reminder',
        status: 'sending',
        sentAt: Date.now(),
        metadata: {
          leagueFeeId: String(fee._id),
          seasonName: season?.name || '',
          paymentLink
        }
      })
    } catch (e) {
      console.warn('messageLogs.createMessageLog failed (non-fatal):', e)
    }

    let sendResult: any
    try {
      if (!resend) throw new Error('Resend not configured')
      sendResult = await resend.emails.send({
        from: fromAddress,
        to: [parent.email],
        subject,
        html,
        text,
        tags: [
          ...(messageLogId ? [{ name: 'message_log_id', value: String(messageLogId) }] : []),
          { name: 'parent_id', value: String(parent._id) },
          { name: 'type', value: 'league_fee_reminder' },
        ],
      } as any)

      // If domain not verified or forbidden, retry with onboarding domain
      if (sendResult?.error) {
        const errStr = typeof sendResult.error === 'string' ? sendResult.error : JSON.stringify(sendResult.error)
        const isDomainUnverified = errStr.includes('domain is not verified') || (sendResult.error as any)?.statusCode === 403
        if (isDomainUnverified) {
          const fb = await resend.emails.send({
            from: 'RA1 Basketball <onboarding@resend.dev>',
            to: [parent.email],
            subject,
            html,
            text,
          } as any)
          if (!fb?.error) sendResult = fb
        }
      }
    } catch (e) {
      console.error('Resend send() threw:', e)
      if (messageLogId) {
        try {
          await convex.mutation(api.messageLogs.updateMessageStatus, {
            id: messageLogId,
            status: 'failed',
            failureReason: (e as any)?.message || 'Resend send failed',
            errorMessage: String(e)
          })
        } catch {}
      }
      return NextResponse.json({ success: false, error: (e as Error).message || 'Resend send failed' }, { status: 500 })
    }

    // Handle Resend SDK { data, error } pattern
    if (sendResult?.error) {
      console.error('Resend send() error:', sendResult.error)
      if (messageLogId) {
        try {
          await convex.mutation(api.messageLogs.updateMessageStatus, {
            id: messageLogId,
            status: 'failed',
            failureReason: sendResult.error?.message || 'Resend error',
            errorMessage: sendResult.error
          })
        } catch {}
      }
      return NextResponse.json({ success: false, error: sendResult.error?.message || 'Resend error' }, { status: 502 })
    }

    // Increment reminder count & mark as sent
    try {
      if (fee?._id) {
        await convex.mutation(api.leagueFees.incrementReminderCount, { id: fee._id as any })
      }
      if (messageLogId) {
        await convex.mutation(api.messageLogs.updateMessageStatus, {
          id: messageLogId,
          status: 'sent',
          deliveredAt: Date.now(),
        })
        await convex.mutation(api.messageLogs.createMessageAnalytics, {
          messageLogId,
          parentId: parent._id as any,
          channel: 'email',
          messageType: 'league_fee_reminder',
        })
      }
    } catch (e) {
      console.warn('post-send bookkeeping failed (non-fatal):', e)
    }

    return NextResponse.json({
      success: true,
      data: { messageId: sendResult?.data?.id || null, to: parent.email, subject }
    })

  } catch (error) {
    console.error('Error sending league fee reminder:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
