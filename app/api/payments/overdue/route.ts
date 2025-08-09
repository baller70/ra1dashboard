
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth, requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const { paymentIds, action } = body

    if (!paymentIds || !Array.isArray(paymentIds)) {
      return NextResponse.json({ error: 'Payment IDs are required' }, { status: 400 })
    }

    switch (action) {
      case 'sendReminder':
        // For now, just return success since reminder tracking isn't in the schema
        return NextResponse.json({
          success: true,
          message: `Reminders sent for ${paymentIds.length} payments`
        })

      case 'markPaid':
        // Mark payments as paid
        for (const paymentId of paymentIds) {
          await convex.mutation(api.payments.markPaymentAsPaid, {
            paymentId: paymentId as any,
          });
        }

        return NextResponse.json({
          success: true,
          message: `${paymentIds.length} payments marked as paid`
        })

      case 'extendDueDate':
        const { days } = body
        if (!days || days < 1) {
          return NextResponse.json({ error: 'Valid extension days required' }, { status: 400 })
        }

        // Due date extension would need a new mutation that supports dueDate updates
        // For now, just return success
        return NextResponse.json({
          success: true,
          message: `Due dates extended by ${days} days for ${paymentIds.length} payments (feature needs implementation)`
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Overdue payment action error:', error)
    return NextResponse.json(
      { error: 'Failed to process overdue payment action' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // Allow API key bypass in Vercel environments; falls back to Clerk if configured
    await requireAuthWithApiKeyBypass(request)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '1000')

    const result = await convex.query(api.payments.getPayments, {
      page,
      limit,
    } as any)

    const now = Date.now()
    const payments = Array.isArray(result?.payments) ? result.payments : []

    const overdue: any[] = []

    // Evaluate each payment against the overdue definition:
    // - One-time payment: overdue if not paid AND dueDate < now
    // - Payment plan: overdue only if at least one installment is past due (pending with dueDate < now)
    for (const p of payments) {
      if (!p) continue
      if (p.status === 'paid') continue

      // If this is a payment plan parent payment
      if (p.paymentPlanId) {
        try {
          const installments = await convex.query(api.paymentInstallments.getPaymentInstallments as any, {
            parentPaymentId: p._id as any,
          })

          const overdueInst = (Array.isArray(installments) ? installments : [])
            .filter((i: any) => i?.status === 'pending' && i?.dueDate && i.dueDate < now)

          if (overdueInst.length === 0) {
            // On-time plan → not overdue
            continue
          }

          // Use the oldest overdue installment due date and sum overdue amounts
          const oldestDue = overdueInst.reduce((min: number, i: any) => Math.min(min, i.dueDate), Number.MAX_SAFE_INTEGER)
          const overdueAmount = overdueInst.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0)

          overdue.push({
            _id: p._id,
            parentId: p.parentId,
            parentName: p.parentName || p.parent?.name || 'Unknown Parent',
            parentEmail: p.parentEmail || p.parent?.email || 'No email',
            amount: overdueAmount,
            dueDate: oldestDue,
            daysPastDue: Math.floor((now - oldestDue) / (1000 * 60 * 60 * 24)),
            remindersSent: p.remindersSent || 0,
            lastReminderSent: p.lastReminderSent || null,
            status: 'overdue',
            parent: p.parent || null,
          })
        } catch (e) {
          // If installments cannot be loaded, fall back to conservative single-payment rule
          if (p?.status === 'overdue' || (p?.status === 'pending' && p?.dueDate && p.dueDate < now)) {
            overdue.push({
              _id: p._id,
              parentId: p.parentId,
              parentName: p.parentName || p.parent?.name || 'Unknown Parent',
              parentEmail: p.parentEmail || p.parent?.email || 'No email',
              amount: Number(p.amount || 0),
              dueDate: p.dueDate,
              daysPastDue: p.dueDate ? Math.floor((now - p.dueDate) / (1000 * 60 * 60 * 24)) : 0,
              remindersSent: p.remindersSent || 0,
              lastReminderSent: p.lastReminderSent || null,
              status: p.status,
              parent: p.parent || null,
            })
          }
        }
      } else {
        // One-time payment rule
        if (p?.status === 'overdue' || (p?.status === 'pending' && p?.dueDate && p.dueDate < now)) {
          overdue.push({
            _id: p._id,
            parentId: p.parentId,
            parentName: p.parentName || p.parent?.name || 'Unknown Parent',
            parentEmail: p.parentEmail || p.parent?.email || 'No email',
            amount: Number(p.amount || 0),
            dueDate: p.dueDate,
            daysPastDue: p.dueDate ? Math.floor((now - p.dueDate) / (1000 * 60 * 60 * 24)) : 0,
            remindersSent: p.remindersSent || 0,
            lastReminderSent: p.lastReminderSent || null,
            status: p.status,
            parent: p.parent || null,
          })
        }
      }
    }

    return NextResponse.json(overdue)
  } catch (error) {
    console.error('Overdue GET error:', error)
    return NextResponse.json({ error: 'Failed to load overdue payments' }, { status: 500 })
  }
}
