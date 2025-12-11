export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id

    // Get payment from Prisma
    let payment = await prisma.payments.findUnique({
      where: { id: paymentId },
      include: {
        payment_plans: true
      }
    })

    // If not found by Prisma ID, try a broader search
    if (!payment) {
      payment = await prisma.payments.findFirst({
        where: {
          OR: [
            { id: paymentId },
            { id: { contains: paymentId } }
          ]
        },
        include: {
          payment_plans: true
        }
      })
    }

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Generate payment history based on payment data
    const history: any[] = []

    // Add creation entry
    if (payment.createdAt) {
      history.push({
        id: 'created',
        action: 'Payment Created',
        description: `Payment of $${(payment.amount || 0).toLocaleString()} was created`,
        performedBy: 'System',
        performedAt: payment.createdAt.toISOString(),
        amount: payment.amount,
        status: 'pending'
      })
    }

    // Add payment plan info if exists
    if (payment.payment_plans) {
      history.push({
        id: 'plan-assigned',
        action: 'Payment Plan Assigned',
        description: `Assigned to payment plan: ${payment.payment_plans.type} - $${(payment.payment_plans.totalAmount || 0).toLocaleString()} total`,
        performedBy: 'System',
        performedAt: payment.payment_plans.createdAt?.toISOString() || payment.createdAt?.toISOString(),
        amount: payment.payment_plans.totalAmount,
        status: 'info'
      })
    }

    // Add payment completion entry if paid
    if (payment.paidAt) {
      history.push({
        id: 'paid',
        action: 'Payment Completed',
        description: `Payment of $${(payment.amount || 0).toLocaleString()} was received via ${payment.paymentMethod || 'unknown method'}`,
        performedBy: 'System',
        performedAt: payment.paidAt.toISOString(),
        amount: payment.amount,
        status: 'paid'
      })
    }

    // Add overdue status change if applicable
    if (payment.status === 'overdue' && payment.dueDate) {
      const dayAfterDue = new Date(payment.dueDate.getTime() + 24 * 60 * 60 * 1000)
      history.push({
        id: 'overdue-status',
        action: 'Status Changed',
        description: `Payment became overdue after the due date passed`,
        performedBy: 'System',
        performedAt: dayAfterDue.toISOString(),
        amount: 0,
        status: 'overdue'
      })
    }

    // Add update history if payment was modified
    if (payment.updatedAt && payment.createdAt && 
        payment.updatedAt.getTime() !== payment.createdAt.getTime() && 
        !payment.paidAt) {
      history.push({
        id: 'updated',
        action: 'Payment Updated',
        description: `Payment details were modified`,
        performedBy: 'System',
        performedAt: payment.updatedAt.toISOString(),
        amount: payment.amount,
        status: payment.status || 'unknown'
      })
    }

    // Sort history by date (newest first)
    history.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())

    return NextResponse.json({
      success: true,
      history
    })

  } catch (error) {
    console.error('Payment history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
