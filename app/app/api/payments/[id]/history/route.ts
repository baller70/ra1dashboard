export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../../lib/api-utils'
import { convexHttp } from '../../../../../lib/convex'
import { api } from '../../../../../convex/_generated/api'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    const paymentId = params.id

    // Get payment from Convex
    const payment = await convexHttp.query(api.payments.getPayment, {
      id: paymentId as any
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Generate payment history based on payment data
    // TODO: Implement proper payment history table in Convex for detailed audit trail
    const history = [
      {
        id: '1',
        action: 'Payment Created',
        description: `Payment of $${payment.amount} was created and assigned to parent`,
        performedBy: 'System',
        performedAt: payment.createdAt || Date.now(),
        amount: payment.amount,
        status: 'pending'
      }
    ]

    // Add payment completion entry if paid
    if (payment.paidAt) {
      history.push({
        id: '2',
        action: 'Payment Completed',
        description: `Payment was marked as paid`,
        performedBy: 'System',
        performedAt: payment.paidAt,
        amount: payment.amount,
        status: 'paid'
      })
    }

    // Add overdue status change if applicable
    if (payment.status === 'overdue' && payment.dueDate) {
      const dueDate = new Date(payment.dueDate)
      const dayAfterDue = new Date(dueDate.getTime() + 24 * 60 * 60 * 1000)
      
      history.push({
        id: 'overdue-status',
        action: 'Status Changed',
        description: `Payment became overdue after the due date passed`,
        performedBy: 'System',
        performedAt: dayAfterDue.getTime(),
        amount: 0,
        status: 'overdue'
      })
    }

    // Add update history if payment was modified
    if (payment.updatedAt && payment.updatedAt !== payment.createdAt) {
      history.push({
        id: 'updated',
        action: 'Payment Updated',
        description: `Payment details were modified`,
        performedBy: 'System',
        performedAt: payment.updatedAt,
        amount: payment.amount,
        status: payment.status || 'unknown'
      })
    }

    // Sort history by date (newest first)
    history.sort((a, b) => b.performedAt - a.performedAt)

    return NextResponse.json({
      success: true,
      history: history.map(h => ({
        ...h,
        performedAt: new Date(h.performedAt).toISOString()
      }))
    })

  } catch (error) {
    console.error('Payment history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
} 