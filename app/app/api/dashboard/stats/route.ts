
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'
import { 
  requireAuthWithApiKeyBypass, 
  createErrorResponse, 
  createSuccessResponse, 
  isDatabaseError,
  ApiErrors 
} from '../../../../lib/api-utils'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    // Get dashboard stats from Convex
    const stats = await convexHttp.query(api.dashboard.getDashboardStats, {});

    return createSuccessResponse(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return createErrorResponse(ApiErrors.UNAUTHORIZED)
    }
    
    if (isDatabaseError(error)) {
      return createSuccessResponse({
        message: 'Please check database configuration',
        fallbackStats: {
          totalParents: 0,
          totalRevenue: 0,
          overduePayments: 0,
          upcomingDues: 0,
          activePaymentPlans: 0,
          messagesSentThisMonth: 0
        }
      })
    }
    
    return createErrorResponse(ApiErrors.INTERNAL_ERROR)
  }
}
