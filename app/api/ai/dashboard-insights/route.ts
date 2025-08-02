
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
    // Temporarily disabled for testing: await requireAuth()
    

    // Fetch comprehensive dashboard data using Convex
    const dashboardStats = await convex.query(api.dashboard.getDashboardStats)

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
  const {
    totalParents,
    totalRevenue,
    overduePayments,
    upcomingDues,
    activeContracts,
    recentMessages,
    recentPayments,
    recentContracts
  } = data

  // Calculate key ratios
  const overdueRate = totalParents > 0 ? (overduePayments / totalParents * 100) : 0
  const contractSigningRate = totalParents > 0 ? (activeContracts / totalParents * 100) : 0
  const avgRevenuePerParent = totalParents > 0 ? (totalRevenue / totalParents) : 0

  const messages = [
    {
      role: "system" as const,
      content: `You are an AI business analyst for the "Rise as One Yearly Program". Generate executive dashboard insights in JSON format with:

- executiveSummary (high-level overview)
- keyInsights (array of important observations)
- alerts (urgent issues requiring attention)
- opportunities (growth and improvement areas)
- recommendations (actionable suggestions)
- trends (patterns and forecasts)
- riskFactors (potential concerns)
- successMetrics (positive indicators)
- priorityActions (immediate actions needed)

Focus on actionable insights and business intelligence.`
    },
    {
      role: "user" as const,
      content: `Generate dashboard insights for:

Key Metrics:
- Total Active Parents: ${totalParents}
- Total Revenue: $${totalRevenue.toFixed(2)}
- Overdue Payments: ${overduePayments} (${overdueRate.toFixed(1)}% of parents)
- Upcoming Dues (7 days): ${upcomingDues}
- Active Contracts: ${activeContracts} (${contractSigningRate.toFixed(1)}% signing rate)
- Messages Sent (30 days): ${recentMessages}
- Average Revenue per Parent: $${avgRevenuePerParent.toFixed(2)}

Recent Activity:
- Recent Payments: ${recentPayments.length} completed
- Recent Contracts: ${recentContracts.length} uploaded
- Latest Payment: $${recentPayments[0]?.amount || 0} from ${recentPayments[0]?.parent?.name || 'N/A'}

Provide strategic insights and actionable recommendations for program management.`
    }
  ]

  try {
    // Use OpenAI through our AI library
    const aiResult = await generateAIDashboardInsights(data)
    
    if (!aiResult.success) {
      throw new Error(aiResult.error || 'Failed to generate insights')
    }
    
    return aiResult.insights
  } catch (error) {
    console.error('Dashboard insights AI error:', error)
    return {
      executiveSummary: 'Dashboard metrics available for review',
      keyInsights: [
        `Managing ${totalParents} active parents`,
        `$${totalRevenue.toFixed(2)} total revenue generated`,
        `${overduePayments} payments currently overdue`
      ],
      alerts: overduePayments > 5 ? ['High number of overdue payments requires attention'] : [],
      opportunities: ['Review payment processes for optimization'],
      recommendations: ['Monitor overdue payments closely', 'Engage with parents proactively'],
      trends: ['Manual analysis recommended'],
      riskFactors: overdueRate > 20 ? ['High overdue rate may impact cash flow'] : [],
      successMetrics: [`${contractSigningRate.toFixed(1)}% contract signing rate`],
      priorityActions: overduePayments > 0 ? ['Follow up on overdue payments'] : []
    }
  }
}
