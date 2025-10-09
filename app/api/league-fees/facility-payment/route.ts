export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { convexHttp } from '@/lib/convex-server'
import { api } from '@/convex/_generated/api'

export async function POST(request: NextRequest) {
  try {
    const { feeId, parentId } = await request.json()

    if (!feeId || !parentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: feeId, parentId' },
        { status: 400 }
      )
    }

    // Fetch league fee from Convex
    const fee = await (convexHttp as any).query(api.leagueFees.getLeagueFee as any, { id: feeId as any })
    if (!fee || String(fee.parentId) !== String(parentId)) {
      return NextResponse.json(
        { success: false, error: 'League fee not found' },
        { status: 404 }
      )
    }

    if (fee.status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'This fee has already been paid' },
        { status: 409 }
      )
    }

    // Mark as paid in Convex (note: keeps existing amounts/method)
    const updated = await (convexHttp as any).mutation(api.leagueFees.markLeagueFeePaid as any, {
      id: feeId as any,
      notes: 'Paid at facility - confirmed by parent'
    })

    // Enrich with parent & season for UI
    const [parent, season] = await Promise.all([
      (convexHttp as any).query(api.parents.getParent as any, { id: parentId as any }),
      (convexHttp as any).query(api.seasons.getSeason as any, { id: fee.seasonId as any })
    ])

    return NextResponse.json({
      success: true,
      data: {
        message: 'Payment confirmed! Your league fee has been marked as paid.',
        fee: { ...updated, parent, season }
      }
    })

  } catch (error) {
    console.error('Error processing facility payment:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feeId = searchParams.get('feeId')
    const parentId = searchParams.get('parentId')

    if (!feeId || !parentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: feeId, parentId' },
        { status: 400 }
      )
    }

    const fee = await (convexHttp as any).query(api.leagueFees.getLeagueFee as any, { id: feeId as any })
    if (!fee || String(fee.parentId) !== String(parentId)) {
      return NextResponse.json(
        { success: false, error: 'League fee not found' },
        { status: 404 }
      )
    }

    const [parent, season] = await Promise.all([
      (convexHttp as any).query(api.parents.getParent as any, { id: parentId as any }),
      (convexHttp as any).query(api.seasons.getSeason as any, { id: fee.seasonId as any })
    ])

    return NextResponse.json({ success: true, data: { ...fee, parent, season } })

  } catch (error) {
    console.error('Error fetching league fee for facility payment:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
