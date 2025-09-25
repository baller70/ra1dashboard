export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { convexHttp } from '@/lib/convex-server'
import { api } from '@/convex/_generated/api'

// GET /api/cron/installments/charge-overdue
// Scans for overdue pending installments and attempts off_session charges sequentially
export async function GET(request: NextRequest) {
  const startedAt = Date.now()

  // Optional basic guard to avoid accidental public triggering
  const url = new URL(request.url)
  const allow = url.searchParams.get('allow')
  const cronKey = request.headers.get('x-cron-key')
  const requiredKey = process.env.CRON_SECRET
  if (requiredKey && cronKey !== requiredKey && allow !== '1') {
    return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 })
  }

  try {
    // Fetch overdue installments
    const overdue: any[] = await convexHttp.query(api.paymentInstallments.getOverdueInstallments as any, {})
    const toProcess = Array.isArray(overdue) ? overdue : []

    const origin = url.origin

    let attempted = 0
    let succeeded = 0
    let skipped = 0
    const results: any[] = []

    for (const inst of toProcess) {
      // Fresh check: skip if already not pending
      if (inst?.status !== 'pending') { skipped++; continue }
      attempted++
      try {
        const res = await fetch(`${origin}/api/installments/${inst._id}/charge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentPaymentId: inst.parentPaymentId }),
        })
        const json = await res.json().catch(() => ({}))
        results.push({ id: inst._id, status: res.status, body: json })
        if (res.ok) succeeded++
      } catch (e: any) {
        results.push({ id: inst._id, error: e?.message })
      }
    }

    const durationMs = Date.now() - startedAt
    return NextResponse.json({ attempted, succeeded, skipped, count: toProcess.length, durationMs, results })
  } catch (error: any) {
    console.error('Cron charge-overdue error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to run cron' }, { status: 500 })
  }
}

