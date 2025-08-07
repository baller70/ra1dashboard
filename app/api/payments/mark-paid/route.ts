export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function POST(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    const body = await request.json()
    const { id } = body || {}
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing payment id' }, { status: 400 })
    }

    // mark paid
    await convexHttp.mutation(api.payments.updatePayment as any, {
      id,
      status: 'paid',
      paidAt: Date.now()
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark paid error:', error)
    return NextResponse.json({ success: false, error: 'Failed to mark as paid' }, { status: 500 })
  }
}

