
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
// Clerk auth
import { generateBulkOperationPlan } from '../../../../lib/ai'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'
import { appendSignature } from '../../../../lib/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: Request) {
  try {
    // Temporarily disabled for testing: await requireAuth()
    

    const { operation, parentIds, parameters } = await request.json()

    let results
    switch (operation) {
      case 'generate_personalized_messages':
        results = await generatePersonalizedMessages(parentIds, parameters)
        break
      case 'assess_parent_risks':
        results = await assessParentRisks(parentIds)
        break
      case 'generate_payment_reminders':
        results = await generatePaymentReminders(parentIds, parameters)
        break
      case 'optimize_payment_schedules':
        results = await optimizePaymentSchedules(parentIds, parameters)
        break
      case 'analyze_communication_effectiveness':
        results = await analyzeCommunicationEffectiveness(parentIds)
        break
      case 'predict_retention_risk':
        results = await predictRetentionRisk(parentIds)
        break
      default:
        throw new Error('Unknown bulk operation')
    }

    return NextResponse.json({
      success: true,
      operation,
      results,
      processedCount: parentIds?.length || 0,
      timestamp: new Date()
    })

  } catch (error) {
    console.error('Bulk operations error:', error)
    return NextResponse.json(
      { error: 'Failed to execute bulk operation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function generatePaymentReminders(parentIds: string[], parameters: any) {
  const { tone, urgency } = parameters

  const parentsResult = await convex.query(api.parents.getParents, {})
  const parents = parentsResult.parents || []

  const reminders = []
  for (const parent of parents) {
    // For now, simplified implementation
    reminders.push({
      parentId: parent._id,
      parentName: parent.name,
      reminder: `This is a ${tone} reminder for ${parent.name} about their upcoming payment. Urgency: ${urgency}.`,
      tone: tone
    })
  }

  return {
    totalProcessed: parents.length,
    successfullyGenerated: reminders.filter(r => r.reminder).length,
    failed: reminders.filter(r => !r.reminder).length,
    reminders: reminders
  }
}

async function generatePersonalizedMessages(parentIds: string[], parameters: any) {
  const { messageType, tone, includeDetails } = parameters

  const parentsResult = await convex.query(api.parents.getParents, {})
  const parents = parentsResult.parents || []

  const personalizedMessages = []
  for (const parent of parents) {
    // For now, simplified implementation
    personalizedMessages.push({
      parentId: parent._id,
      parentName: parent.name,
      message: `Personalized ${messageType} message for ${parent.name}`,
      tone: tone
    })
  }

  return {
    totalProcessed: parents.length,
    successfullyGenerated: personalizedMessages.filter(m => m.message).length,
    failed: personalizedMessages.filter(m => !m.message).length,
    messages: personalizedMessages
  }
}

async function assessParentRisks(parentIds: string[]) {
  try {
    // Call the optimized AI analysis API for risk assessment
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/analyze-parent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentIds: parentIds,
        analysisType: 'risk_assessment'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to get risk assessment')
    }

    const data = await response.json()
    
    if (data.success && data.results) {
      // Transform the results to match the expected format
      const assessments = data.results.map((result: any) => ({
        parentId: result.parentId,
        parentName: result.parentName,
        riskLevel: result.analysis.riskLevel,
        riskScore: result.analysis.riskScore,
        engagementScore: result.analysis.engagementScore,
        paymentBehavior: result.analysis.paymentBehavior,
        riskFactors: result.analysis.recommendations || [],
        recommendations: result.analysis.nextActions || [],
        communicationStyle: result.analysis.communicationStyle
      }))
      
      return { assessments }
    }
    
    throw new Error('No results returned from analysis')
  } catch (error) {
    console.error('Risk assessment error:', error)
    // Return fallback data
    const fallbackAssessments = parentIds.map(parentId => ({
      parentId,
      parentName: 'Unknown',
      riskLevel: 'medium',
      riskScore: 50,
      engagementScore: 50,
      paymentBehavior: 'unknown',
      riskFactors: ['Unable to complete full analysis'],
      recommendations: ['Please try again later'],
      communicationStyle: { preferredChannel: 'email', preferredTone: 'friendly' }
    }))
    
    return { assessments: fallbackAssessments }
  }
}

function buildParentContext(parent: any, includeDetails: boolean) {
  const context = {
    name: parent.name,
    email: parent.email,
    totalPayments: parent.payments.length,
    recentPayments: parent.payments.slice(0, 3),
    activeContracts: parent.contracts.filter((c: any) => c.status === 'signed').length,
    activePlans: parent.paymentPlans.length
  }

  if (includeDetails) {
    context.recentPayments = parent.payments.slice(0, 5)
    // Add more detailed context
  }

  return context
}

async function generateAIMessage(context: any, messageType: string, tone: string, parentName: string) {
  const messages = [
    {
      role: "system" as const,
      content: `Generate a personalized ${messageType} message with ${tone} tone for a parent in the "Rise as One Yearly Program". Return only the message content as plain text. Do NOT include any signature, closing signature block, or contact information placeholders at the end of the message.`
    },
    {
      role: "user" as const,
      content: `Generate message for ${parentName} with context: ${JSON.stringify(context)}. Do NOT add any signature or closing signature block.`
    }
  ]

  // For now, return a simple personalized message
  // TODO: Integrate with OpenAI AI library for better personalization
  // Note: parentName should be the emergency contact first name
  const baseMessage = `Dear ${parentName}, this is a ${messageType} message regarding your participation in the Rise as One Yearly Program. Thank you for your continued support.`
  return appendSignature(baseMessage, 'plain')
}

function calculatePersonalizationLevel(context: any): number {
  let score = 0
  if (context.recentPayments?.length > 0) score += 30
  if (context.activeContracts > 0) score += 20
  if (context.activePlans > 0) score += 25
  if (context.totalPayments > 5) score += 25
  return Math.min(score, 100)
}

function calculateRiskMetrics(parent: any) {
  const totalPayments = parent.payments.length
  const overduePayments = parent.payments.filter((p: any) => p.status === 'overdue').length
  const onTimePayments = parent.payments.filter((p: any) => 
    p.status === 'paid' && p.paidAt && new Date(p.paidAt) <= new Date(p.dueDate)
  ).length

  const paymentReliability = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 100
  const overdueRate = totalPayments > 0 ? (overduePayments / totalPayments) * 100 : 0

  let riskScore = 0
  if (overdueRate > 30) riskScore += 40
  else if (overdueRate > 15) riskScore += 25
  else if (overdueRate > 5) riskScore += 10

  if (paymentReliability < 70) riskScore += 30
  else if (paymentReliability < 85) riskScore += 15

  const riskLevel = riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low'

  return {
    riskScore,
    riskLevel,
    paymentReliability,
    overdueRate,
    totalPayments,
    overduePayments
  }
}

async function generateRiskAssessment(parent: any, metrics: any) {
  // Simplified risk assessment generation
  return {
    summary: `Risk level: ${metrics.riskLevel}`,
    factors: [
      `Payment reliability: ${metrics.paymentReliability.toFixed(1)}%`,
      `Overdue rate: ${metrics.overdueRate.toFixed(1)}%`
    ],
    recommendations: metrics.riskLevel === 'high' ? 
      ['Immediate follow-up required', 'Consider payment plan adjustment'] :
      ['Monitor payment patterns', 'Maintain regular communication']
  }
}

async function optimizePaymentSchedules(parentIds: string[], parameters: any) {
  return { message: 'Payment schedule optimization not yet implemented' }
}

async function analyzeCommunicationEffectiveness(parentIds: string[]) {
  return { message: 'Communication analysis not yet implemented' }
}

async function predictRetentionRisk(parentIds: string[]) {
  return { message: 'Retention risk prediction not yet implemented' }
}
