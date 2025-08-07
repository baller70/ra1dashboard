
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    console.log('🔄 Revenue trends API called - returning empty data since all data has been purged...')
    
    // ALL REVENUE DATA HAS BEEN PERMANENTLY PURGED
    // Return empty trends array
    const emptyTrends = [];
    
    return NextResponse.json(emptyTrends)
  } catch (error) {
    console.error('Revenue trends error:', error)
    
    // Return empty data since all data has been purged
    return NextResponse.json([])
  }
}
