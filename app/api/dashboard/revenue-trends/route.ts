
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    console.log('🔄 Revenue trends API called - fetching REAL revenue data...')
    
    // Get real revenue trends from Convex using existing function
    const revenueTrends = await convexHttp.query(api.dashboard.getRevenueTrends, {});
    console.log('📈 REAL REVENUE TRENDS from Convex:', revenueTrends);
    
    return NextResponse.json(revenueTrends)
  } catch (error) {
    console.error('Revenue trends error:', error)
    
    // Return empty trends if error occurs
    return NextResponse.json([])
  }
}
