export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { convexHttp } from '@/lib/convex-server'
import { api } from '@/convex/_generated/api'

// POST: send reminders to all unpaid (pending/overdue) league fees
export async function POST(request: NextRequest) {
  try {
    // Get all unpaid fees (joined with parent & season)
    const unpaid = await (convexHttp as any).query(api.leagueFees.getUnpaidLeagueFees as any, {})

    // Group parent IDs by season
    const bySeason: Record<string, string[]> = {}
    for (const fee of unpaid || []) {
      if (!fee?.parent?.email) continue
      const sid = String(fee.seasonId)
      if (!bySeason[sid]) bySeason[sid] = []
      if (!bySeason[sid].includes(String(fee.parentId))) bySeason[sid].push(String(fee.parentId))
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ra1dashboard.vercel.app'
    const results: any[] = []
    let sent = 0

    // Call internal bulk reminder sender per season
    for (const [seasonId, parentIds] of Object.entries(bySeason)) {
      if (parentIds.length === 0) continue
      try {
        const resp = await fetch(`${baseUrl}/api/league-fees/send-bulk-reminders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seasonId, parentIds })
        })
        const json = await resp.json().catch(() => ({}))
        results.push({ seasonId, ...(json?.data || {}), ok: resp.ok })
        if (resp.ok && json?.data?.sent) sent += Number(json.data.sent)
      } catch (e) {
        results.push({ seasonId, error: (e as any)?.message || 'failed' })
      }
    }

    return NextResponse.json({ success: true, data: { seasonsProcessed: Object.keys(bySeason).length, sent, results } })
  } catch (error) {
    console.error('Error in auto-reminder job:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}

// GET: preview stats of unpaid fees
export async function GET(request: NextRequest) {
  try {
    const unpaid = await (convexHttp as any).query(api.leagueFees.getUnpaidLeagueFees as any, {})
    const stats = (unpaid || []).map((f: any) => ({
      feeId: f._id,
      parentName: f?.parent?.name,
      parentEmail: f?.parent?.email,
      seasonName: f?.season?.name,
      status: f?.status,
      dueDate: f?.dueDate ? new Date(f.dueDate).toISOString() : null,
      remindersSent: f?.remindersSent || 0,
    }))
    return NextResponse.json({ success: true, data: { totalUnpaid: stats.length, stats } })
  } catch (error) {
    console.error('Error fetching reminder stats:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
