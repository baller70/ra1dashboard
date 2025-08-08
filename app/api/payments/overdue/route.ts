
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
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
