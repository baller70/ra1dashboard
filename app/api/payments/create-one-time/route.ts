export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

function getConvex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL
  if (!url) throw new Error('Convex URL not configured')
  return new ConvexHttpClient(url)
}

export async function POST(request: NextRequest) {
  try {
    const { parentId, amount, dueDate, paymentMethod } = await request.json()
    if (!parentId || !amount) {
      return NextResponse.json({ error: 'Missing parentId or amount' }, { status: 400 })
    }

    const convex = getConvex()

    // Verify parent exists to avoid cross-project ID issues
    try {
      const parent = await convex.query(api.parents.getParent as any, { id: parentId as any })
      if (!parent) {
        return NextResponse.json({ error: `Parent not found: ${parentId}` }, { status: 400 })
      }
    } catch (e: any) {
      return NextResponse.json({ error: `Parent lookup failed: ${e?.message || 'unknown'}` }, { status: 500 })
    }

    const paymentId = await convex.mutation(api.payments.createPayment, {
      parentId,
      amount: Number(amount),
      dueDate: Number(dueDate || Date.now()),
      status: 'pending',
      paymentMethod: paymentMethod || 'stripe_card',
    })

    return NextResponse.json({ paymentId })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create one-time payment' }, { status: 500 })
  }
}


