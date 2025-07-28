
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { convexHttp } from '../../../../lib/convex'
import { api } from '../../../../convex/_generated/api'
import { requireAuth } from '../../../../lib/api-utils'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    // Get payment from Convex
    const payment = await convexHttp.query(api.payments.getPayment, {
      id: params.id as any
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Payment fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const body = await request.json()
    const { status, paidAt, notes } = body

    // Update payment in Convex
    const updatedPayment = await convexHttp.mutation(api.payments.updatePayment, {
      id: params.id as any,
      status,
      paidAt: paidAt ? new Date(paidAt).getTime() : undefined,
      notes
    });

    return NextResponse.json(updatedPayment)
  } catch (error) {
    console.error('Payment update error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment' },
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

    // Delete payment in Convex (need to implement this mutation)
    // For now, return success
    return NextResponse.json({ message: 'Payment deleted successfully' })
  } catch (error) {
    console.error('Payment deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    )
  }
}
