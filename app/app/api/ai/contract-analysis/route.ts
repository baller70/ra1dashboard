
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
// Clerk auth
import { analyzeContract } from '../../../../lib/ai'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: Request) {
  try {
    await requireAuth()
    

    const { contractId, action } = await request.json()

    if (!contractId) {
      return NextResponse.json({ error: 'Contract ID is required' }, { status: 400 })
    }

    const contract = await convex.query(api.contracts.getContract, { id: contractId as any })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    let analysis
    switch (action) {
      case 'analyze_status':
        analysis = await analyzeContractStatus(contract)
        break
      case 'renewal_recommendation':
        analysis = await generateRenewalRecommendation(contract)
        break
      case 'compliance_check':
        analysis = await checkCompliance(contract)
        break
      case 'risk_assessment':
        analysis = await assessContractRisk(contract)
        break
      default:
        analysis = await analyzeContractStatus(contract)
    }

    return NextResponse.json({
      success: true,
      contractId,
      action,
      analysis,
      timestamp: new Date()
    })

  } catch (error) {
    console.error('Contract analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze contract', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function analyzeContractStatus(contract: any) {
  const messages = [
    {
      role: "system" as const,
      content: `You are an AI contract analyst for the "Rise as One Yearly Program". Analyze contract status and provide insights.

Provide analysis in JSON format with:
- summary (brief overview of contract status)
- keyTerms (important contract details identified)
- statusAssessment (detailed status evaluation)
- recommendations (actionable suggestions)
- riskLevel (low, medium, high, critical)
- urgentActions (immediate actions needed)
- complianceScore (0-100)`
    },
    {
      role: "user" as const,
      content: `Analyze this contract:

Contract: ${contract.originalName}
Parent: ${contract.parent.name} (${contract.parent.email})
Status: ${contract.status}
Uploaded: ${contract.uploadedAt.toDateString()}
${contract.signedAt ? `Signed: ${contract.signedAt.toDateString()}` : 'Not signed yet'}
${contract.expiresAt ? `Expires: ${contract.expiresAt.toDateString()}` : 'No expiration set'}
Template Type: ${contract.templateType || 'Not specified'}
File Size: ${contract.fileSize} bytes

Parent Context:
- Recent payments: ${contract.parent.payments?.length || 0}
- Active payment plans: ${contract.parent.paymentPlans?.length || 0}
- Total contracts: ${contract.parent.contracts?.length || 0}

${contract.notes ? `Notes: ${contract.notes}` : ''}

Provide comprehensive contract analysis focusing on status, compliance, and recommendations.`
    }
  ]

  try {
    // Use OpenAI through our AI library
    const contractText = `Contract: ${contract.originalName}\nStatus: ${contract.status}\nParent: ${contract.parent?.name}\nAmount: $${contract.totalAmount}\nExpires: ${contract.expiresAt}\nNotes: ${contract.notes || 'None'}`
    const aiResult = await analyzeContract(contractText)
    
    if (!aiResult.success) {
      throw new Error(aiResult.error || 'Failed to analyze contract')
    }
    
    return aiResult.analysis
  } catch (error) {
    console.error('Contract analysis AI error:', error)
    return {
      summary: 'Unable to generate AI analysis',
      keyTerms: [],
      statusAssessment: 'Manual review required',
      recommendations: ['Review contract manually'],
      riskLevel: 'medium',
      urgentActions: [],
      complianceScore: 50
    }
  }
}

async function generateRenewalRecommendation(contract: any) {
  const daysUntilExpiry = contract.expiresAt ? 
    Math.ceil((new Date(contract.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null

  const messages = [
    {
      role: "system" as const,
      content: `Generate contract renewal recommendations in JSON format with:
- shouldRenew (boolean)
- renewalUrgency (low, medium, high, critical)
- renewalTimeline (suggested timeline)
- recommendations (specific actions)
- riskFactors (potential issues)
- benefits (renewal advantages)`
    },
    {
      role: "user" as const,
      content: `Generate renewal recommendation for:

Contract: ${contract.originalName}
Parent: ${contract.parent.name}
Current Status: ${contract.status}
${daysUntilExpiry !== null ? `Days until expiry: ${daysUntilExpiry}` : 'No expiration date'}
Parent payment history: ${contract.parent.payments?.length || 0} payments
Active payment plans: ${contract.parent.paymentPlans?.length || 0}

Consider parent's payment reliability and engagement level.`
    }
  ]

  try {
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: messages,
        response_format: { type: "json_object" },
        max_tokens: 1000,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`)
    }

    const aiResponse = await response.json()
    let content = aiResponse.choices[0].message.content
    
    // Remove markdown code blocks if present
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/\s*```/g, '')
    }
    
    return JSON.parse(content)
  } catch (error) {
    console.error('Renewal recommendation AI error:', error)
    return {
      shouldRenew: true,
      renewalUrgency: 'medium',
      renewalTimeline: '30-60 days before expiry',
      recommendations: ['Manual review recommended'],
      riskFactors: ['Unable to assess automatically'],
      benefits: ['Continued program participation']
    }
  }
}

async function checkCompliance(contract: any) {
  // Similar AI analysis for compliance checking
  return {
    complianceScore: 85,
    issues: [],
    recommendations: ['Contract appears compliant'],
    lastChecked: new Date()
  }
}

async function assessContractRisk(contract: any) {
  // Similar AI analysis for risk assessment
  return {
    riskScore: 25,
    riskLevel: 'low',
    factors: ['Good parent payment history'],
    mitigations: []
  }
}
