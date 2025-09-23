export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'
import { convexHttp } from '@/app/lib/convex-server'

// POST: mark or unmark an installment as paid, without Stripe charge
// Body: { markPaid: boolean, method?: string, note?: string, actor?: string }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json().catch(() => ({}))
    const markPaid = !!body.markPaid
    const method = typeof body.method === 'string' ? body.method : undefined
    const note = typeof body.note === 'string' ? body.note : undefined
    const actor = typeof body.actor === 'string' ? body.actor : undefined

    if (!id) {
      return NextResponse.json({ error: 'Missing installment id' }, { status: 400 })
    }

    const result = await (convexHttp as any).mutation(api.paymentInstallments.setManualInstallmentStatus, {
      installmentId: id as any,
      markPaid,
      method,
      note,
      actor,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Manual installment status error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to update installment' }, { status: 500 })
  }
}

