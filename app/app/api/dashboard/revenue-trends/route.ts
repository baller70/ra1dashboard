
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET() {
  try {
    await requireAuth()
    
    // Get revenue trends from Convex
    const trends = await convexHttp.query(api.dashboard.getRevenueTrends, {});

    return NextResponse.json(trends)
  } catch (error) {
    console.error('Revenue trends error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue trends' },
      { status: 500 }
    )
  }
}
