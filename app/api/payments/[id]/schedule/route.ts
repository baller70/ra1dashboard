export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { convexHttp } from '../../../../../lib/convex-server'
import { api } from '../../../../../convex/_generated/api'

// PUT: Modify payment schedule (update installment amounts and due dates)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { schedule } = body

    if (!schedule || !Array.isArray(schedule)) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: schedule (array)' },
        { status: 400 }
      )
    }

    // Validate schedule items
    for (const item of schedule) {
      if (typeof item.amount !== 'number' || item.amount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Each schedule item must have a positive amount' },
          { status: 400 }
        )
      }
      if (typeof item.dueDate !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Each schedule item must have a dueDate (timestamp)' },
          { status: 400 }
        )
      }
      if (typeof item.installmentNumber !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Each schedule item must have an installmentNumber' },
          { status: 400 }
        )
      }
    }

    // Call the Convex mutation to modify the payment schedule
    const result = await convexHttp.mutation(api.paymentInstallments.modifyPaymentSchedule as any, {
      parentPaymentId: params.id as any,
      newSchedule: schedule.map((item: any) => ({
        installmentId: item.installmentId || undefined,
        amount: item.amount,
        dueDate: item.dueDate,
        installmentNumber: item.installmentNumber,
      })),
    })

    return NextResponse.json({
      success: true,
      message: 'Payment schedule updated successfully',
      result,
    })
  } catch (error) {
    console.error('Error modifying payment schedule:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to modify payment schedule' },
      { status: 500 }
    )
  }
}

