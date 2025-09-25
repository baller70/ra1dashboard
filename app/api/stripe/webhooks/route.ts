export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(secret, { apiVersion: '2024-06-20' } as any)
}

// Mock league fees data for webhook processing (should match the data from league-fees routes)
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

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 400 })
  }

  let event: Stripe.Event
  const signature = request.headers.get('stripe-signature') || ''

  try {
    const payload = await request.text()
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err?.message || err)
    return NextResponse.json({ error: `Webhook Error: ${err?.message || 'invalid signature'}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const mode = session.mode
        const metadata = session.metadata || {}
        const paymentId = (metadata as any).paymentId as string | undefined
        const parentId = (metadata as any).parentId as string | undefined
        const leagueFeeId = (metadata as any).leagueFeeId as string | undefined
        const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id

        console.log('Checkout session completed:', {
          sessionId: session.id,
          mode,
          paymentId,
          parentId,
          leagueFeeId,
          paymentIntentId,
          metadata
        })

        // Handle league fee payments from payment links
        if (mode === 'payment' && leagueFeeId && parentId) {
          try {
            // Find the league fee in our mock data
            const feeIndex = mockLeagueFees.findIndex(fee => fee._id === leagueFeeId && fee.parentId === parentId)

            if (feeIndex !== -1) {
              // Update the league fee status to paid
              mockLeagueFees[feeIndex] = {
                ...mockLeagueFees[feeIndex],
                status: 'paid',
                paymentMethod: 'stripe',
                paidAt: Date.now(),
                stripePaymentIntentId: paymentIntentId,
                updatedAt: Date.now(),
                paymentNote: 'Paid via Stripe payment link'
              }

              console.log('League fee marked as paid:', {
                leagueFeeId,
                parentId,
                parentName: mockLeagueFees[feeIndex].parent.name,
                amount: mockLeagueFees[feeIndex].totalAmount,
                sessionId: session.id
              })

              // In a real implementation, you would also:
              // 1. Update the database record
              // 2. Cancel any pending reminders
              // 3. Send confirmation email to parent
              // 4. Notify admin of successful payment

            } else {
              console.error('League fee not found for payment:', { leagueFeeId, parentId })
            }

          } catch (error) {
            console.error('Error processing league fee payment:', error)
          }
        }

        // Handle regular one-time checkout payments
        else if (mode === 'payment' && paymentId) {
          try {
            const existing = await convex.query(api.payments.getPayment as any, { id: paymentId as any })
            if (existing?.status === 'paid' && (!!existing?.stripePaymentIntentId && existing.stripePaymentIntentId === paymentIntentId)) {
              console.log('Webhook no-op: payment already marked paid with same PI', { paymentId, paymentIntentId })
            } else {
              await convex.mutation(api.payments.updatePayment as any, {
                id: paymentId as any,
                status: 'paid',
                paidAt: existing?.paidAt || Date.now(),
                stripePaymentIntentId: paymentIntentId || existing?.stripePaymentIntentId || undefined,
                notes: 'Marked paid via Stripe webhook (checkout.session.completed)'
              })
            }
          } catch (convexErr) {
            console.error('Convex updatePayment failed from webhook:', convexErr)
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        // Persist parent Stripe IDs on success if available
        try {
          const pi = event.data.object as Stripe.PaymentIntent
          const md: any = pi.metadata || {}
          const parentId = md.parentId as string | undefined
          const customerId = typeof pi.customer === 'string' ? pi.customer : (pi.customer as any)?.id
          const paymentMethodId = typeof pi.payment_method === 'string' ? pi.payment_method : (pi.payment_method as any)?.id
          if (parentId && (customerId || paymentMethodId)) {
            try {
              await convex.mutation(api.parents.updateParent as any, {
                id: parentId as any,
                ...(customerId ? { stripeCustomerId: customerId } : {}),
                ...(paymentMethodId ? { stripePaymentMethodId: paymentMethodId } : {}),
              })
            } catch (e) {
              console.warn('Parent update from PI success failed (non-fatal):', (e as any)?.message)
            }
          }
        } catch {}

        const pi = event.data.object as Stripe.PaymentIntent

        // Handle regular payment updates
        const paymentId = (pi.metadata as any)?.paymentId as string | undefined
        if (paymentId) {
          try {
            const existing = await convex.query(api.payments.getPayment as any, { id: paymentId as any })
            if (existing?.status === 'paid' && (!!existing?.stripePaymentIntentId && existing.stripePaymentIntentId === pi.id)) {
              console.log('Webhook no-op: payment already marked paid with same PI', { paymentId, paymentIntentId: pi.id })
            } else {
              await convex.mutation(api.payments.updatePayment as any, {
                id: paymentId as any,
                status: 'paid',
                paidAt: existing?.paidAt || Date.now(),
                stripePaymentIntentId: pi.id,
                notes: 'Marked paid via Stripe webhook (payment_intent.succeeded)'
              })
            }
          } catch (convexErr) {
            console.error('Convex updatePayment failed from webhook (PI):', convexErr)
          }
        }

        // Handle league fee payments
        const leagueFeeId = (pi.metadata as any)?.leagueFeeId as string | undefined
        if (leagueFeeId) {
          try {
            await convex.mutation(api.leagueFees.markLeagueFeePaid, {
              id: leagueFeeId as any,
              stripePaymentIntentId: pi.id,
              notes: 'Marked paid via Stripe webhook (payment_intent.succeeded)'
            })

            // Cancel any pending reminders for this league fee
            await convex.mutation(api.leagueFeeReminders.cancelRemindersForLeagueFee, {
              leagueFeeId: leagueFeeId as any
            })
          } catch (convexErr) {
            console.error('Convex league fee update failed from webhook (PI):', convexErr)
          }
        }
        // Mark installment paid if metadata.installmentId present
        try {
          const pi = event.data.object as Stripe.PaymentIntent
          const md: any = pi.metadata || {}
          const installmentId = md.installmentId as string | undefined
          if (installmentId) {
            try {
              await convex.mutation(api.paymentInstallments.markInstallmentPaid as any, {
                installmentId: installmentId as any,
                stripePaymentIntentId: pi.id,
              })
            } catch (convexErr) {
              console.error('Convex markInstallmentPaid failed from webhook (PI):', convexErr)
            }
          }
        } catch {}
        break
      }

      case 'payment_intent.processing': {
        try {
          const pi = event.data.object as Stripe.PaymentIntent
          const pmType = (pi.payment_method_types && pi.payment_method_types[0]) || ''
          if (pmType === 'us_bank_account') {
            console.log('ACH processing event received; leaving status pending until succeeded', { id: pi.id })
          }
        } catch {}
        break
      }

      case 'invoice.payment_succeeded': {
        // Subscription payment succeeded. We can log for now; deeper linkage can be added later
        const invoice = event.data.object as Stripe.Invoice
        console.log('Subscription invoice paid:', { invoiceId: invoice.id, customer: invoice.customer })
        break
      }

      case 'payment_intent.payment_failed': {
        try {
          const pi = event.data.object as Stripe.PaymentIntent
          const md: any = pi.metadata || {}
          const installmentId = md.installmentId as string | undefined
          if (installmentId) {
            try {
              await convex.mutation(api.paymentInstallments.markInstallmentOverdue as any, {
                installmentId: installmentId as any,
              })
            } catch (convexErr) {
              console.error('Convex markInstallmentOverdue failed from webhook (PI failed):', convexErr)
            }
          }
        } catch {}
        break
      }

      default:
        // For all other events, acknowledge
        break
    }

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 })
  }
}


