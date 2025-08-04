export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { 
  requireAuthWithApiKeyBypass, 
  createErrorResponse, 
  createSuccessResponse 
} from '../../../../lib/api-utils';

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request);

    const url = new URL(request.url);
    const dateRange = url.searchParams.get('dateRange') || 'month';
    
    console.log('🔄 Fetching comprehensive analytics data from Convex...');
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    // Get comprehensive analytics data
    const analytics = await convex.query(api.analytics.getDashboardAnalytics, { 
      dateRange,
      timestamp: Date.now() // Cache busting
    });
    
    console.log('📊 Comprehensive analytics fetched:', {
      totalParents: analytics.overview.totalParents,
      totalRevenue: analytics.overview.totalRevenue,
      paymentSuccessRate: analytics.overview.paymentSuccessRate,
      messagesSent: analytics.overview.messagesSentThisPeriod,
      dataPoints: analytics.meta.dataPoints
    });
    
    // Add cache-busting headers for live updates
    const response = createSuccessResponse({
      success: true,
      data: analytics,
      timestamp: Date.now()
    });
    
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
    
  } catch (error) {
    console.error('Comprehensive analytics API error:', error);
    return createErrorResponse('Failed to fetch comprehensive analytics', 500);
  }
}