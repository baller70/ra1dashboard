
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
// Clerk auth
import { generateDashboardInsights as generateAIDashboardInsights } from '../../../../lib/ai'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET() {
  try {
    await requireAuth()
    

    // Fetch comprehensive dashboard data using Convex
    const dashboardStats = await convex.query(api.dashboard.getFixedDashboardStats)

    // Get recent activity for context
    const recentActivity = await convex.query(api.dashboard.getRecentActivity)

    // Generate AI insights
    const insights = await generateDashboardInsights({
      totalParents: dashboardStats.totalParents,
      totalRevenue: dashboardStats.totalRevenue,
      overduePayments: dashboardStats.overduePayments,
      upcomingDues: dashboardStats.upcomingDues,
      activeContracts: dashboardStats.activePaymentPlans,
      recentMessages: dashboardStats.messagesSentThisMonth,
             recentPayments: recentActivity || [],
       recentContracts: []
    })

    return NextResponse.json({
      success: true,
      insights,
      metrics: {
        totalParents: dashboardStats.totalParents,
        totalRevenue: dashboardStats.totalRevenue,
        overduePayments: dashboardStats.overduePayments,
        upcomingDues: dashboardStats.upcomingDues,
        activeContracts: dashboardStats.activePaymentPlans,
        recentMessages: dashboardStats.messagesSentThisMonth
      },
      generatedAt: new Date()
    })

  } catch (error) {
    console.error('Dashboard insights error:', error)
    return NextResponse.json(
      { error: 'Failed to generate dashboard insights', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function generateDashboardInsights(data: any) {
  try {
    // Use the AI library function directly
    const aiResult = await generateAIDashboardInsights(data)
    
    if (!aiResult.success) {
      throw new Error(aiResult.error || 'Failed to generate insights')
    }
    
    return aiResult.insights
  } catch (error) {
    console.error('Dashboard insights AI error:', error)
    
    // Return fallback insights in the correct AIInsight format
    const {
      totalParents,
      totalRevenue,
      overduePayments,
      upcomingDues,
      activeContracts,
      recentMessages
    } = data

    // Calculate key ratios
    const overdueRate = totalParents > 0 ? (overduePayments / totalParents * 100) : 0
    const contractSigningRate = totalParents > 0 ? (activeContracts / totalParents * 100) : 0
    const avgRevenuePerParent = totalParents > 0 ? (totalRevenue / totalParents) : 0

    return {
      summary: `Rise as One Program managing ${totalParents} active parents with $${totalRevenue.toFixed(2)} total revenue. ${overduePayments} parents have overdue payments (${overdueRate.toFixed(1)}% rate).`,
      keyMetrics: {
        programHealth: overdueRate < 10 ? 'good' : overdueRate < 20 ? 'fair' : 'needs_attention',
        growthTrend: totalRevenue > 0 ? 'stable' : 'needs_attention',
        parentSatisfaction: overdueRate < 15 ? 'medium' : 'low',
        totalParents,
        totalRevenue,
        overdueRate: overdueRate.toFixed(1) + '%',
        contractSigningRate: contractSigningRate.toFixed(1) + '%',
        avgRevenuePerParent: avgRevenuePerParent.toFixed(2)
      },
      recommendations: [
        'Monitor overdue payments closely and follow up proactively',
        'Implement automated payment reminders to reduce overdue rates',
        'Review payment collection processes for optimization',
        'Consider offering payment plan options for struggling parents'
      ],
      riskFactors: [
        ...(overdueRate > 20 ? ['High overdue payment rate may impact cash flow'] : []),
        ...(upcomingDues > totalParents * 0.5 ? ['Large number of upcoming payments may strain collection resources'] : []),
        ...(recentMessages < totalParents * 0.1 ? ['Low communication frequency may affect parent engagement'] : [])
      ],
      actionItems: [
        ...(overduePayments > 0 ? ['Follow up on overdue payments immediately'] : []),
        ...(upcomingDues > 10 ? ['Prepare for upcoming payment collection wave'] : []),
        'Review and update parent communication templates',
        'Analyze payment trends for process improvements'
      ]
    }
  }
}
