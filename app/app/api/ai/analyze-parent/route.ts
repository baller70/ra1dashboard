
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
// Clerk auth
import { analyzeParent } from '../../../../lib/ai'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: Request) {
  try {
    // Temporarily disabled for testing: await requireAuth()
    

    const { parentId, parentIds, analysisType } = await request.json()

    // Handle both single parent and multiple parents
    const ids = parentIds || (parentId ? [parentId] : [])
    
    if (!ids.length) {
      return NextResponse.json({ error: 'Parent ID(s) are required' }, { status: 400 })
    }

    // Only fetch and process the requested parents
    const results = []
    for (const parentId of ids) {
      // Fetch specific parent data
      const parent = await convex.query(api.parents.getParent, { id: parentId }) as any
      
      if (!parent) {
        console.log(`Parent ${parentId} not found, skipping`)
        continue
      }
      // Fetch related data for each parent
      try {
        console.log('Processing parent:', parent._id, parent.name)
        
        // Fetch payments for this parent (limited for faster analysis)
        const paymentsResult = await convex.query(api.payments.getPayments, { 
          parentId: parent._id,
          limit: 20 
        }) as any
        const payments = paymentsResult?.payments || []
        console.log('Payments fetched:', payments.length)

        // Fetch message logs for this parent (limited for faster analysis)
        const messageLogsResult = await convex.query(api.messageLogs.getMessageLogs, { 
          parentId: parent._id,
          limit: 20 
        }) as any
        const messageLogs = messageLogsResult?.messages || []
        console.log('Message logs fetched:', messageLogs.length)

        // Create enhanced parent object with related data
        const enhancedParent = {
          ...parent,
          payments: payments || [],
          messageLogs: messageLogs || [],
          contracts: [], // Contracts not implemented yet, use empty array
          paymentPlans: [] // Payment plans not fetched separately, use empty array for now
        }

        console.log('Enhanced parent data structure:', {
          hasPayments: Array.isArray(enhancedParent.payments),
          paymentsLength: enhancedParent.payments?.length,
          hasMessageLogs: Array.isArray(enhancedParent.messageLogs),
          messageLogsLength: enhancedParent.messageLogs?.length,
          hasContracts: Array.isArray(enhancedParent.contracts)
        })

        // Calculate metrics with enhanced data
        const metrics = calculateParentMetrics(enhancedParent)
        
        // Generate AI analysis
        const analysis = generateAIAnalysis(enhancedParent, metrics)

        results.push({
          parentId: parent._id,
          parentName: parent.name,
          analysis,
          metrics
        })
      } catch (error) {
        console.error(`Error processing parent ${parent._id}:`, error)
        // Continue with basic analysis using empty arrays
        const metrics = calculateParentMetrics({
          ...parent,
          payments: [],
          messageLogs: [],
          contracts: []
        })
        
        const analysis = generateAIAnalysis(parent, metrics)

        results.push({
          parentId: parent._id,
          parentName: parent.name,
          analysis,
          metrics
        })
      }
    }

    return NextResponse.json({
      success: true,
      analysisType: analysisType || 'general',
      processedCount: results.length,
      results,
      lastUpdated: new Date()
    })

  } catch (error) {
    console.error('Parent analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze parent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function calculateParentMetrics(parent: any) {
  const now = new Date()
  
  // Ensure arrays exist with defaults and proper type checking
  const payments = Array.isArray(parent.payments) ? parent.payments : []
  const messageLogs = Array.isArray(parent.messageLogs) ? parent.messageLogs : []
  const contracts = Array.isArray(parent.contracts) ? parent.contracts : []
  const paymentPlans = parent.paymentPlans || []
  
  // Payment reliability
  const totalPayments = payments.length
  const paidOnTime = payments.filter((p: any) => 
    p.status === 'paid' && p.paidAt && new Date(p.paidAt) <= new Date(p.dueDate)
  ).length
  const paymentReliability = totalPayments > 0 ? (paidOnTime / totalPayments) * 100 : 0

  // Overdue payments
  const overduePayments = payments.filter((p: any) => p.status === 'overdue').length
  
  // Communication responsiveness (simplified - based on message frequency)
  const recentMessages = messageLogs.filter((m: any) => {
    if (!m.sentAt) return false
    const messageDate = new Date(m.sentAt)
    const daysDiff = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff <= 30
  })
  
  // Contract compliance
  const activeContracts = contracts.filter((c: any) => c.status === 'signed').length
  const totalContracts = contracts.length
  const contractCompliance = totalContracts > 0 ? (activeContracts / totalContracts) * 100 : 0

  // Financial health
  const totalOwed = payments
    .filter((p: any) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount.toString()), 0)

  return {
    paymentReliability,
    overduePayments,
    recentCommunications: recentMessages.length,
    contractCompliance,
    totalOwed,
    totalPayments,
    activePlans: paymentPlans.filter((pp: any) => pp.status === 'active').length
  }
}

function generateAIAnalysis(parent: any, metrics: any) {
  // Use faster, more direct analysis based on metrics
  const riskScore = calculateRiskScore(metrics)
  const riskLevel = getRiskLevel(riskScore)
  const engagementScore = calculateEngagementScore(metrics)
  
  console.log('Generating analysis for:', parent.name, 'Risk score:', riskScore, 'Engagement:', engagementScore)
  
  return {
    riskScore,
    riskLevel,
    engagementScore,
    paymentBehavior: metrics.paymentReliability > 80 ? 'excellent' : 
                     metrics.paymentReliability > 60 ? 'good' : 
                     metrics.paymentReliability > 40 ? 'fair' : 'poor',
    communicationStyle: {
      preferredChannel: 'email',
      preferredTone: riskScore > 60 ? 'formal and direct' : 'friendly and informative'
    },
    recommendations: generateRecommendations(metrics, riskScore),
    nextActions: generateNextActions(metrics, parent.name)
  }
}

function calculateRiskScore(metrics: any): number {
  let score = 0
  
  // Payment reliability impact (40% of score)
  score += (100 - metrics.paymentReliability) * 0.4
  
  // Overdue payments impact (30% of score)
  score += Math.min(metrics.overduePayments * 20, 100) * 0.3
  
  // Communication impact (20% of score)
  score += (metrics.recentCommunications < 2 ? 30 : 0) * 0.2
  
  // Total owed impact (10% of score)
  score += Math.min(metrics.totalOwed / 100, 20) * 0.1
  
  return Math.min(100, Math.max(0, score))
}

function getRiskLevel(score: number): string {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function calculateEngagementScore(metrics: any): number {
  let score = 50 // Base score
  
  // Payment reliability boost
  score += (metrics.paymentReliability - 50) * 0.5
  
  // Communication boost
  score += metrics.recentCommunications * 10
  
  // Active plans boost
  score += metrics.activePlans * 5
  
  return Math.min(100, Math.max(0, score))
}

function generateRecommendations(metrics: any, riskScore: number): string[] {
  const recommendations = []
  
  if (metrics.overduePayments > 0) {
    recommendations.push('Send immediate payment reminder with clear due dates and amounts.')
  }
  
  if (metrics.paymentReliability < 70) {
    recommendations.push('Consider setting up automatic payment reminders or payment plan options.')
  }
  
  if (metrics.recentCommunications < 2) {
    recommendations.push('Increase communication frequency with program updates and engagement activities.')
  }
  
  if (riskScore < 30) {
    recommendations.push('Maintain current positive relationship with regular check-ins and program updates.')
  }
  
  return recommendations.length > 0 ? recommendations : ['Continue standard communication and monitoring.']
}

function generateNextActions(metrics: any, parentName: string): string[] {
  const actions = []
  
  if (metrics.overduePayments > 2) {
    actions.push(`Schedule urgent call with ${parentName} to discuss payment issues.`)
  } else if (metrics.overduePayments > 0) {
    actions.push(`Send payment reminder email to ${parentName}.`)
  }
  
  if (metrics.recentCommunications === 0) {
    actions.push(`Reach out to ${parentName} to check engagement and program satisfaction.`)
  }
  
  if (actions.length === 0) {
    actions.push(`Continue regular program updates and check-ins with ${parentName}.`)
  }
  
  return actions

}
