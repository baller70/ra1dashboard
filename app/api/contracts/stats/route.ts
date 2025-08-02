
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'

export async function GET() {
  try {
    await requireAuth()
    
    // For now, return mock data since contracts table isn't implemented in Convex yet
    // TODO: Implement contracts table in Convex schema and create analytics queries
    const mockStats = {
      stats: {
        total: 0,
        signed: 0,
        pending: 0,
        expired: 0,
        expiringSoon: 0
      },
      recentContracts: [],
      contractsByTemplate: [],
      monthlyTrend: Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          contracts: 0
        };
      })
    };

    return NextResponse.json(mockStats)

  } catch (error) {
    console.error('Contract stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract statistics' },
      { status: 500 }
    )
  }
}
