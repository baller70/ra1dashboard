export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { convexHttp } from '../../../../../lib/convex-server'
import { api } from '../../../../../convex/_generated/api'

// Create a custom check-based installment schedule for a payment
// Body: { installments: number (1-12), frequency: number months (1-12), installmentAmount: number, startDate?: string, checkNumbers?: string[] }
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const installments = Number(body.installments)
    const frequency = Number(body.frequency)
    const installmentAmount = Number(body.installmentAmount)
    const startDateIso: string | undefined = body.startDate
    const checkNumbers: string[] = Array.isArray(body.checkNumbers) ? body.checkNumbers : []

    if (!installments || installments < 1 || installments > 12) {
      return NextResponse.json({ error: 'installments must be between 1 and 12' }, { status: 400 })
    }
    if (!frequency || frequency < 1 || frequency > 12) {
      return NextResponse.json({ error: 'frequency (months) must be between 1 and 12' }, { status: 400 })
    }
    if (!installmentAmount || installmentAmount <= 0) {
      return NextResponse.json({ error: 'installmentAmount must be > 0' }, { status: 400 })
    }
    if (checkNumbers.length > 0 && checkNumbers.length !== installments) {
      return NextResponse.json({ error: 'checkNumbers length must match installments count' }, { status: 400 })
    }

    // Fetch payment to get parentId
    const payment = await convexHttp.query(api.payments.getPayment as any, { id: params.id as any })
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Create equal-amount installments using existing batch creator
    const startDateMs = startDateIso ? new Date(startDateIso).getTime() : Date.now()

    const createdIds: string[] = await convexHttp.mutation(api.paymentInstallments.createInstallments as any, {
      parentPaymentId: (payment as any)._id || params.id,
      parentId: (payment as any).parentId,
      paymentPlanId: (payment as any).paymentPlanId ?? undefined,
      totalAmount: installmentAmount * installments,
      installmentAmount,
      totalInstallments: installments,
      frequency,
      startDate: startDateMs,
    })

    // Persist check numbers on the parent payment notes as JSON for retrieval
    try {
      const existingNotes: string = (payment as any).notes || ''
      const existingParsed = (() => { try { return JSON.parse(existingNotes) } catch { return {} } })()
      const newNotes = JSON.stringify({
        ...existingParsed,
        checkSchedule: {
          installments,
          frequency,
          installmentAmount,
          checkNumbers,
        }
      })

      await convexHttp.mutation(api.payments.updatePayment as any, {
        id: (payment as any)._id || params.id,
        notes: newNotes,
      })
    } catch (e) {
      // Non-fatal
      console.warn('Failed to update payment notes with check numbers:', e)
    }

    return NextResponse.json({
      success: true,
      createdInstallments: createdIds,
      schedule: { installments, frequency, installmentAmount },
    })
  } catch (error) {
    console.error('check-schedule error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create check schedule' }, { status: 500 })
  }
}

