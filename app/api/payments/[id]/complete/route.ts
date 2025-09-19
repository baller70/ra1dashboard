export const dynamic = "force-dynamic";
export const runtime = "nodejs";


import { NextRequest, NextResponse } from 'next/server'
import { api } from "../../../../convex/_generated/api"
import { convexHttp } from "../../../../lib/convex-server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let stage = 'start'
  try {
    stage = 'parse-body'
    const raw = await request.json().catch(() => ({} as any))
    const { paymentMethod, cardLast4 } = raw || ({} as any)

    const paymentId = params.id
    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment id in route params', stage }, { status: 400 })
    }

    stage = 'fetch-payment'
    const payment = await convexHttp.query(api.payments.getPayment as any, { id: paymentId as any })
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found', stage }, { status: 404 })
    }

    // Idempotent success if already paid
    if ((payment as any).status === 'paid') {
      return NextResponse.json({ success: true, message: 'Already paid', paymentId, stage })
    }

    stage = 'normalize-method'
    const methodToken = (() => {
      const v = String(paymentMethod || '').toLowerCase()
      if (v === 'credit_card' || v === 'card' || v === 'stripe' || v === 'stripe_card') return 'stripe_card'
      if (v === 'check' || v === 'cheque') return 'check'
      if (v === 'cash') return 'cash'
      return 'stripe_card'
    })()

    stage = 'update-payment'
    await convexHttp.mutation(api.payments.updatePayment as any, {
      id: paymentId as any,
      status: 'paid',
      paidAt: Date.now(),
      paymentMethod: methodToken,
      notes: cardLast4 ? `Paid via ${methodToken} • **** ${cardLast4}` : undefined,
    } as any)

    stage = 'done'
    return NextResponse.json({ success: true, message: 'Payment completed successfully', paymentId, stage })

  } catch (error: any) {
    const message = error?.message || String(error)
    console.error('Error completing payment (stage=' + stage + '):', error)
    return NextResponse.json({ error: 'Internal server error', details: message, stage }, { status: 500 })
  }
}