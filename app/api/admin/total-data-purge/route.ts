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

export async function POST(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🔥 TOTAL DATA PURGE - Permanently deleting ALL dashboard and analytics data...')
    
    const result = await convex.mutation(api.totalDataPurge.purgeAllDashboardAnalyticsData, {})
    
    console.log('✅ Data purge completed:', result)
    
    return createSuccessResponse({
      message: "ALL dashboard and analytics data permanently deleted",
      deletionStats: result.deletionStats,
      success: result.success
    })
    
  } catch (error) {
    console.error('Total data purge API error:', error)
    return createErrorResponse(ApiErrors.INTERNAL_ERROR, `Data purge failed: ${error}`)
  }
}

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🔍 AUDITING remaining data after purge...')
    
    const auditResult = await convex.mutation(api.totalDataPurge.auditRemainingData, {})
    
    console.log('📊 Audit completed:', auditResult)
    
    return createSuccessResponse({
      message: auditResult.message,
      audit: auditResult.audit,
      totalRecords: auditResult.totalRecords,
      success: auditResult.success
    })
    
  } catch (error) {
    console.error('Data audit API error:', error)
    return createErrorResponse(ApiErrors.INTERNAL_ERROR, `Data audit failed: ${error}`)
  }
}
