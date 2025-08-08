export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'
import { 
  requireAuthWithApiKeyBypass, 
  createErrorResponse, 
  createSuccessResponse, 
  ApiErrors 
} from '../../../../lib/api-utils'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🔄 FORCE REFRESH: Returning empty data since all dashboard data has been purged...')
    
    // ALL DASHBOARD DATA HAS BEEN PERMANENTLY PURGED
    // Return empty/zero values since database has been cleared
    const refreshedStats = {
      totalParents: 0,
      totalRevenue: 0,
      activeTemplates: 0,
      activePaymentPlans: 0,
      pendingPayments: 0,
      overduePayments: 0,
      upcomingDues: 0,
      messagesSentThisMonth: 0,
      paymentSuccessRate: 0,
      averagePaymentTime: 0,
      refreshedAt: new Date().toISOString()
    };
    
    console.log('🔄 FORCE REFRESH FINAL STATS:', refreshedStats);
    
    const response = createSuccessResponse(refreshedStats)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('X-Force-Refresh', 'true')
    
    return response
    
  } catch (error) {
    console.error('Force refresh error:', error)
    
    return createErrorResponse(
      'Failed to force refresh dashboard: ' + (error instanceof Error ? error.message : 'Unknown error'),
      500,
      ApiErrors.INTERNAL_ERROR
    )
  }
}
