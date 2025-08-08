export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    // Get communication analytics from Convex
    try {
      // Get message logs count for this month
      const messageLogs = await convex.query(api.messageLogs.list, {});
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const messagesSentThisMonth = messageLogs.filter(log => {
        const logDate = new Date(log._creationTime);
        return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
      }).length;

      // Get templates count
      const templates = await convex.query(api.templates.list, {});
      const activeTemplates = templates.length;

      return NextResponse.json({
        success: true,
        data: {
          messagesSentThisMonth,
          activeTemplates,
          totalMessagesSent: messageLogs.length,
          templatesUsed: templates.filter(t => t.isActive).length,
          averageResponseTime: 2.5, // Mock data - hours
          successRate: 95 // Mock data - percentage
        }
      });
    } catch (convexError) {
      console.log('Convex query failed, returning empty stats:', convexError);
      // Return empty stats if Convex queries fail
      return NextResponse.json({
        success: true,
        data: {
          messagesSentThisMonth: 0,
          activeTemplates: 0,
          totalMessagesSent: 0,
          templatesUsed: 0,
          averageResponseTime: 0,
          successRate: 0
        }
      });
    }
  } catch (error) {
    console.error('Communication analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch communication analytics' },
      { status: 500 }
    )
  }
}
