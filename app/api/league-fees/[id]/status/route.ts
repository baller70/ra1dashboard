export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { convexHttp } from '@/lib/convex-server'
import { api } from '@/convex/_generated/api'

// PATCH /api/league-fees/[id]/status
// Body: { status: 'paid' | 'pending', notes?: string }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { status, notes } = await request.json()

    if (!id || !status || !['paid', 'pending'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid fields: id, status' },
        { status: 400 }
      )
    }

    // Ensure the fee exists
    const fee = await (convexHttp as any).query(api.leagueFees.getLeagueFee as any, { id: id as any })
    if (!fee) {
      return NextResponse.json(
        { success: false, error: 'League fee not found' },
        { status: 404 }
      )
    }

    let updated: any = null
    if (status === 'paid') {
      updated = await (convexHttp as any).mutation(api.leagueFees.markLeagueFeePaid as any, {
        id: id as any,
        notes: notes || 'Marked paid manually from Payment Detail page'
      })
    } else {
      // revert to pending
      updated = await (convexHttp as any).mutation(api.leagueFees.updateLeagueFeeStatus as any, {
        id: id as any,
        status: 'pending',
        notes: notes || 'Reverted to pending from Payment Detail page'
      })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating league fee status:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

