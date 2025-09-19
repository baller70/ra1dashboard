export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { api } from '@/convex/_generated/api'
import { convexHttp } from '../../../lib/convex-server'

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json().catch(() => ({}))

    const schema = z.object({
      parentId: z.string().min(25, 'Invalid parentId'),
      amount: z.union([z.number(), z.string()]),
      dueDate: z.union([z.number(), z.string()]).optional(),
      paymentMethod: z.string().optional(),
    })

    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().formErrors.join('; ') || 'Invalid payload' }, { status: 400 })
    }

    const { parentId, amount, dueDate, paymentMethod } = parsed.data

    // Normalize amount
    const amountNum = typeof amount === 'string' ? Number(amount) : amount
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Normalize due date (accept number, numeric string, or ISO)
    let dueDateNum = Date.now()
    if (typeof dueDate === 'number' && dueDate > 0) {
      dueDateNum = dueDate
    } else if (typeof dueDate === 'string' && dueDate.trim() !== '') {
      const n = Number(dueDate)
      if (Number.isFinite(n) && n > 0) {
        dueDateNum = n
      } else {
        const ts = Date.parse(dueDate)
        if (!Number.isNaN(ts)) dueDateNum = ts
      }
    }

    // Verify parent exists to avoid cross-project ID issues
    try {
      const parent = await convexHttp.query(api.parents.getParent as any, { id: parentId as any })
      if (!parent) {
        return NextResponse.json({ error: `Parent not found: ${parentId}` }, { status: 404 })
      }
    } catch (e: any) {
      return NextResponse.json({ error: `Parent lookup failed: ${e?.message || 'unknown'}` }, { status: 400 })
    }

    const paymentId = await (convexHttp as any).mutation(api.payments.createPayment, {
      parentId: parentId as any,
      amount: amountNum,
      dueDate: dueDateNum,
      status: 'pending',
      paymentMethod: paymentMethod || 'stripe_card',
    })

    return NextResponse.json({ paymentId })
  } catch (error: any) {
    console.error('create-one-time error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create one-time payment' }, { status: 500 })
  }
}


