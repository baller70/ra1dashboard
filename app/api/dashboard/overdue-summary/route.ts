export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    console.log('🔄 Overdue summary API called - returning empty data since all data has been purged...')
    
    // ALL OVERDUE DATA HAS BEEN PERMANENTLY PURGED
    // Return empty summary
    const emptyOverdueSummary = {
      totalOverduePayments: 0,
      totalOverdueParents: 0,
      overdueSummary: []
    };
    
    return NextResponse.json({
      success: true,
      data: emptyOverdueSummary
    })
  } catch (error) {
    console.error('Overdue summary fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overdue summary' },
      { status: 500 }
    )
  }
}