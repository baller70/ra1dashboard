
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    await requireAuthWithApiKeyBypass(request)
    console.log('🔧 Development mode: Returning empty recent activity for fresh dashboard')
    
    // Return empty activities list for fresh/clean dashboard
    const activities: any[] = []
    
    console.log(`📊 Returning empty activities list (${activities.length} activities)`)
    
    const response = NextResponse.json({
      success: true,
      data: {
        activities: activities,
        total: activities.length
      }
    })
    
    // Add cache-busting headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Recent activity error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch recent activity',
        data: { activities: [], total: 0 }
      },
      { status: 500 }
    )
  }
}
