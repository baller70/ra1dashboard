
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { convexHttp } from '../../../../lib/convex-server'
import { api } from '../../../../convex/_generated/api'
import { requireAuth } from '../../../../lib/api-utils'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Temporarily disabled for testing: await requireAuth()
    
    console.log('GET request for payment ID:', params.id)
    
    // Get payment from Convex
    const payment = await convexHttp.query(api.payments.getPayment, {
      id: params.id as any
    });

    console.log('Payment data from Convex:', payment)

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
      { error: 'Failed to fetch payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Temporarily disabled for testing: await requireAuth()

    const body = await request.json()
    const { status, paidAt, notes } = body

    console.log('PATCH request for payment ID:', params.id, 'with body:', body)

    // Update payment in Convex
    const updatedPayment = await convexHttp.mutation(api.payments.updatePayment, {
      id: params.id as any,
      status,
      paidAt,
      notes
    });

    console.log('Payment updated successfully:', updatedPayment)

    return NextResponse.json(updatedPayment)
  } catch (error) {
    console.error('Payment update error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment', details: error instanceof Error ? error.message : 'Unknown error' },
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

    console.log('DELETE request for payment ID:', params.id)

    // Delete payment in Convex using the deletePayment mutation
    const result = await convexHttp.mutation(api.payments.deletePayment, {
      id: params.id as any
    });

    console.log('Payment deleted successfully:', result)

    return NextResponse.json({ 
      success: true, 
      message: 'Payment deleted successfully',
      data: result 
    })
  } catch (error) {
    console.error('Payment deletion error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete payment', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
