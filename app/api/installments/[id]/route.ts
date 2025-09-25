export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const inst = await convex.query(api.paymentInstallments.getInstallmentById as any, { installmentId: params.id as any })
    if (!inst) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(inst)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch' }, { status: 500 })
  }
}

