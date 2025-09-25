export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(secret, { apiVersion: '2024-06-20' } as any)
}

// POST /api/installments/[id]/charge
// Creates and confirms an off_session PaymentIntent for a pending installment using stored PM
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const installmentId = params.id
    if (!installmentId) return NextResponse.json({ error: 'Missing installmentId' }, { status: 400 })

    const stripe = getStripe()

    // Fetch installment details; allow parentPaymentId to be provided to avoid codegen lag
    let installment: any = null
    try {
      installment = await convex.query(api.paymentInstallments.getInstallmentById as any, { installmentId: installmentId as any })
    } catch {}
    if (!installment) {
      // Fallback: if parentPaymentId provided, fetch list and find
      const body = await request.json().catch(() => ({}))
      const parentPaymentId = body?.parentPaymentId
      if (!parentPaymentId) return NextResponse.json({ error: 'Installment not found (and missing parentPaymentId fallback)' }, { status: 404 })
      const list = await convex.query(api.paymentInstallments.getPaymentInstallments as any, { parentPaymentId: parentPaymentId as any })
      installment = (list || []).find((i: any) => String(i._id) === String(installmentId))
      if (!installment) return NextResponse.json({ error: 'Installment not found in parent payment' }, { status: 404 })
    }
    if (installment.status !== 'pending') return NextResponse.json({ error: 'Installment is not pending' }, { status: 400 })

    // Fetch parent to get stored Stripe IDs
    const parent: any = await convex.query(api.parents.getParent as any, { id: installment.parentId as any })
    if (!parent?.stripeCustomerId || !parent?.stripePaymentMethodId) {
      return NextResponse.json({ error: 'No stored payment method on file for off_session charge' }, { status: 412 })
    }

    // Amount convention: follow existing PI route behavior (assume integer minor units)
    const amount = Math.round(Number(installment.amount || 0))
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount for installment' }, { status: 400 })

    const idempotencyKey = `inst:${installmentId}`

    // Create off_session PI and confirm immediately
    let intent: any
    try {
      intent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: parent.stripeCustomerId,
      payment_method: parent.stripePaymentMethodId,
      off_session: true,
      confirm: true,
      description: `Installment ${installment.installmentNumber}/${installment.totalInstallments || ''}`,
      metadata: {
        source: 'installment_off_session',
        installmentId: String(installmentId),
        parentPaymentId: String(installment.parentPaymentId),
        parentId: String(installment.parentId),
      },
    }, { idempotencyKey })
    } catch (e: any) {
      const msg = String(e?.message || e?.raw?.message || '')
      if (msg.includes('Keys for idempotent requests')) {
        // Retry once with a variant key to unblock legitimate new attempts in preview/test
        intent = await stripe.paymentIntents.create({
          amount,
          currency: 'usd',
          customer: parent.stripeCustomerId,
          payment_method: parent.stripePaymentMethodId,
          off_session: true,
          confirm: true,
          description: `Installment ${installment.installmentNumber}/${installment.totalInstallments || ''}`,
          metadata: {
            source: 'installment_off_session',
            installmentId: String(installmentId),
            parentPaymentId: String(installment.parentPaymentId),
            parentId: String(installment.parentId),
          },
        }, { idempotencyKey: `${idempotencyKey}:${Date.now()}` })
      } else {
        throw e
      }
    }

    // Fallback reconciliation for previews where Stripe webhooks may not be configured
    if (intent.status === 'succeeded') {
      try {
        await convex.mutation(api.paymentInstallments.markInstallmentPaid as any, {
          installmentId: installmentId as any,
          stripePaymentIntentId: intent.id,
          paidAmount: amount,
        })
      } catch (e) {
        console.warn('Installment mark paid fallback failed:', (e as any)?.message)
      }
    }

    return NextResponse.json({ success: true, paymentIntentId: intent.id, status: intent.status })
  } catch (error: any) {
    const details = {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      decline_code: error?.decline_code,
      raw: error?.raw ? { message: error.raw.message, code: error.raw.code, decline_code: error.raw.decline_code } : undefined,
    }
    console.error('Off-session installment charge error:', details)
    const status = error?.statusCode && Number(error.statusCode) >= 400 && Number(error.statusCode) < 600 ? Number(error.statusCode) : 500
    return NextResponse.json({ error: details }, { status })
  }
}

