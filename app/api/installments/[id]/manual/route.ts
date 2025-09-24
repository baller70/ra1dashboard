export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { api } from '../../../../convex/_generated/api'
import { convexHttp } from '../../../../lib/convex-server'

// POST: mark or unmark an installment as paid, without Stripe charge
// Body: { markPaid: boolean, method?: string, note?: string, actor?: string }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // Helper: loose Convex Id check to avoid throwing before we can respond
  const isConvexId = (s: any) => typeof s === 'string' && s.length >= 25 && /^[a-z0-9]+$/i.test(s)

  try {
    const id = params.id
    const body = await request.json().catch(() => ({}))
    const markPaid = !!body.markPaid
    const method = typeof body.method === 'string' ? body.method : undefined
    const note = typeof body.note === 'string' ? body.note : undefined
    const actor = typeof body.actor === 'string' ? body.actor : undefined
    const parentPaymentId = typeof body.parentPaymentId === 'string' ? body.parentPaymentId : undefined

    console.log('[Manual Installment] incoming', { id, markPaid, method, hasNote: !!note, actor })

    if (!id || !isConvexId(id)) {
      return NextResponse.json({ error: 'Invalid or missing id', debug: { id } }, { status: 400 })
    }

    // Try payment path first (some UIs pass a payment id instead of installment id)
    try {
      const payment = await (convexHttp as any).query(api.payments.getPayment, { id: id as any })
      if (payment) {
        const existingNotes = String(payment?.notes || '')
        const existingParsed = (() => { try { return JSON.parse(existingNotes) } catch { return {} } })()
        const now = Date.now()
        const nextNotes = markPaid
          ? JSON.stringify({
              ...existingParsed,
              manualPayment: { at: now, method: method || 'manual', note: note || '', actor: actor || 'admin' },
            })
          : JSON.stringify({
              ...Object.fromEntries(Object.entries(existingParsed).filter(([k]) => k !== 'manualPayment')),
            })

        try {
          const res = await (convexHttp as any).mutation(api.payments.updatePayment, {
            id: id as any,
            status: markPaid ? 'paid' : 'pending',
            paidAt: markPaid ? now : undefined,
            notes: nextNotes,
          })

          // Optionally compute fresh progress if we know the parent payment id (either provided or same as id)
          let progress: any = undefined
          const effectivePaymentId = parentPaymentId || id
          try {
            const rows = await (convexHttp as any).query(api.paymentInstallments.getPaymentInstallments, { parentPaymentId: effectivePaymentId as any })
            const installments = (rows || []).map((inst: any) => ({
              _id: inst._id,
              installmentNumber: inst.installmentNumber,
              amount: inst.amount,
              dueDate: inst.dueDate,
              status: inst.status,
              paidAt: inst.paidAt,
              notes: inst.notes,
              isOverdue: inst.status === 'pending' && inst.dueDate < Date.now(),
            }))
            const totalInstallments = installments.length
            const paidInstallments = installments.filter((i: any) => i.status === 'paid').length
            const overdueInstallments = installments.filter((i: any) => i.isOverdue).length
            const totalAmount = installments.reduce((s: number, i: any) => s + (i.amount || 0), 0)
            const paidAmount = installments.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0)
            const remainingAmount = totalAmount - paidAmount
            const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0
            const pending = installments.filter((i: any) => i.status === 'pending')
            const nextDue = pending.length > 0 ? pending.sort((a: any, b: any) => a.dueDate - b.dueDate)[0] : null
            progress = { totalInstallments, paidInstallments, overdueInstallments, totalAmount, paidAmount, remainingAmount, progressPercentage, nextDue, installments }
          } catch (e) {
            // ignore progress calc failures; UI will refetch
          }

          return NextResponse.json({ success: true, paid: markPaid, updatedId: res, debug: { path: 'payment', id, markPaid }, progress })
        } catch (err: any) {
          console.error('[Manual Installment] updatePayment failed', { id, err: err?.message || String(err) })
          // fall through to installment path just in case
        }
      }
    } catch (err) {
      console.warn('[Manual Installment] payment lookup failed (will try installment path)', { id, err: (err as any)?.message })
    }

    // Default path: treat id as an installment id
    try {
      const result = await (convexHttp as any).mutation(api.paymentInstallments.setManualInstallmentStatus, {
        installmentId: id as any,
        markPaid,
        method,
        note,
        actor,
      })

      if (!result?.success) {
        return NextResponse.json({ error: result?.error || 'Installment not found', debug: { id, path: 'installment' } }, { status: 404 })
      }

      // Optionally compute fresh progress if parentPaymentId is provided
      let progress: any = undefined
      if (parentPaymentId) {
        try {
          const rows = await (convexHttp as any).query(api.paymentInstallments.getPaymentInstallments, { parentPaymentId: parentPaymentId as any })
          const installments = (rows || []).map((inst: any) => ({
            _id: inst._id,
            installmentNumber: inst.installmentNumber,
            amount: inst.amount,
            dueDate: inst.dueDate,
            status: inst.status,
            paidAt: inst.paidAt,
            notes: inst.notes,
            isOverdue: inst.status === 'pending' && inst.dueDate < Date.now(),
          }))
          const totalInstallments = installments.length
          const paidInstallments = installments.filter((i: any) => i.status === 'paid').length
          const overdueInstallments = installments.filter((i: any) => i.isOverdue).length
          const totalAmount = installments.reduce((s: number, i: any) => s + (i.amount || 0), 0)
          const paidAmount = installments.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0)
          const remainingAmount = totalAmount - paidAmount
          const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0
          const pending = installments.filter((i: any) => i.status === 'pending')
          const nextDue = pending.length > 0 ? pending.sort((a: any, b: any) => a.dueDate - b.dueDate)[0] : null
          progress = { totalInstallments, paidInstallments, overdueInstallments, totalAmount, paidAmount, remainingAmount, progressPercentage, nextDue, installments }
        } catch (e) {
          // ignore progress calc failures; UI can refetch
        }
      }

      return NextResponse.json({ success: true, ...result, debug: { path: 'installment', id, markPaid }, progress })
    } catch (err: any) {
      console.error('[Manual Installment] setManualInstallmentStatus failed', { id, err: err?.message || String(err) })
      return NextResponse.json({ error: err?.message || 'Failed to update installment', debug: { id, path: 'installment' } }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Manual installment status error (outer):', error)
    return NextResponse.json({ error: error?.message || 'Failed to update installment (outer)' }, { status: 500 })
  }
}

