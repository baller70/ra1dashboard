
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    // Get payment plan from Convex
    const paymentPlan = await convexHttp.query(api.payments.getPaymentPlan, {
      id: params.id as any
    });

    if (!paymentPlan) {
      return NextResponse.json({ error: 'Payment plan not found' }, { status: 404 })
    }

    return NextResponse.json(paymentPlan)
  } catch (error) {
    console.error('Payment plan fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment plan' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const {
      type,
      totalAmount,
      installmentAmount,
      installments,
      startDate,
      nextDueDate,
      status,
      description
    } = body

    // Update payment plan in Convex
    await convexHttp.mutation(api.payments.updatePaymentPlan, {
      id: params.id as any,
      type,
      totalAmount,
      installmentAmount,
      installments,
      startDate: startDate ? new Date(startDate).getTime() : undefined,
      nextDueDate: nextDueDate ? new Date(nextDueDate).getTime() : undefined,
      status,
      description
    });

    // Get updated payment plan
    const updatedPaymentPlan = await convexHttp.query(api.payments.getPaymentPlan, {
      id: params.id as any
    });

    return NextResponse.json(updatedPaymentPlan)
  } catch (error) {
    console.error('Payment plan update error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment plan' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    // Delete payment plan using Convex mutation
    await convexHttp.mutation(api.payments.deletePaymentPlan, {
      id: params.id as any
    });

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment plan deletion error:', error)
    
    if (error instanceof Error && error.message.includes('Cannot delete payment plan with paid payments')) {
      return NextResponse.json(
        { error: 'Cannot delete payment plan with paid payments' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete payment plan' },
      { status: 500 }
    )
  }
}
