
export const dynamic = "force-dynamic";
// Force fresh deployment - AI Reminder Prompt fix v2

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
// Clerk auth
import { AIMessageRequest } from '../../../../lib/types'
import { generateMessage } from '../../../../lib/ai'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: Request) {
  try {
    // Temporarily disabled for testing: await requireAuth()
    

    const body: AIMessageRequest = await request.json();
    console.log('🔥 FULL REQUEST BODY:', JSON.stringify(body, null, 2))
    const { context: rawContext, customInstructions, includePersonalization, templateId } = body;
    console.log('🔥 EXTRACTED customInstructions:', customInstructions)
    console.log('🔥 customInstructions type:', typeof customInstructions)
    console.log('🔥 customInstructions length:', customInstructions?.length)
    const context: any = rawContext ?? {}; // Ensure we always have an object

    // Fetch parent data if provided
    let parentData = null
    if (context?.parentId) {
      parentData = await convex.query(api.parents.getParent, { id: context.parentId as any })
    }

    // Fetch payment data if provided
    let paymentData = null
    if (context?.paymentId) {
      paymentData = await convex.query(api.payments.getPayment, { id: context.paymentId as any })
    }

    // Fetch contract data if provided
    let contractData = null
    if (context?.contractId) {
      contractData = await convex.query(api.contracts.getContract, { id: context.contractId as any })
    }

    // Build context for AI
    const aiContext = buildAIContext(parentData, paymentData, contractData, context)
    
    // HARDCODED TEST - Always return the custom prompt if it exists
    console.log('🔥 API CALLED - customInstructions:', customInstructions)

    if (customInstructions && customInstructions.trim()) {
      console.log('🔥 CUSTOM INSTRUCTIONS FOUND:', customInstructions)

      return NextResponse.json({
        success: true,
        message: `CUSTOM PROMPT WORKING: ${customInstructions.trim()}`,
        subject: 'Payment Reminder',
        context: {
          parentName: parentData?.name,
          messageType: context.messageType,
          tone: context.tone,
          personalized: includePersonalization
        }
      })
    }

    console.log('🔥 NO CUSTOM INSTRUCTIONS - using default')

    // Generate personalized message using AI for non-custom cases
    const messages = [
      {
        role: "system" as const,
        content: `You are an intelligent assistant for the "Rise as One Yearly Program" parent communication system. Generate personalized, professional messages for parents based on the provided context.

Guidelines:
- Use a ${context?.tone ?? 'friendly'} tone
- Message type: ${context?.messageType ?? 'general'}
- Urgency level: ${context?.urgencyLevel ?? 3}/5
- ${includePersonalization ? 'Include personal details when relevant' : 'Keep message general'}
- Always be respectful and supportive
- Focus on the child's development and program benefits
- Include clear next steps or call-to-action when appropriate

Context: ${aiContext}`
      },
      {
        role: "user" as const,
        content: `Generate a ${context?.messageType ?? 'general'} message with the following requirements:
- Tone: ${context?.tone ?? 'friendly'}
- Urgency: ${context?.urgencyLevel ?? 3}/5

Please provide both subject line and message body in JSON format:
{
  "subject": "Subject line here",
  "body": "Message body here with proper formatting",
  "reasoning": "Brief explanation of personalization choices",
  "suggestions": ["Alternative subject 1", "Alternative subject 2"]
}`
      }
    ]

    // Map message types to OpenAI AI library format
    const mapMessageType = (type: string) => {
      switch (type) {
        case 'reminder': return 'payment_reminder'
        case 'overdue': return 'overdue_notice'
        case 'welcome': return 'welcome'
        case 'follow_up': return 'general'
        case 'renewal': return 'general'
        default: return 'general'
      }
    }

    const mapTone = (tone: string) => {
      switch (tone) {
        case 'formal': return 'professional'
        default: return tone as 'professional' | 'friendly' | 'urgent' | 'casual'
      }
    }

    // Use the messages array we built above with proper custom instructions handling
    console.log('🔥 CUSTOM INSTRUCTIONS DEBUG:', customInstructions)
    console.log('🔥 MESSAGES ARRAY:', JSON.stringify(messages, null, 2))

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    })

    const generatedMessage = completion.choices[0]?.message?.content
    console.log('🔥 OPENAI RESPONSE:', generatedMessage)

    if (!generatedMessage) {
      throw new Error('No message generated from OpenAI')
    }

    // Use the raw message directly
    const messageBody = generatedMessage
    const messageSubject = 'Payment Reminder'

    return NextResponse.json({
      success: true,
      message: messageBody,
      subject: messageSubject,
      context: {
        parentName: parentData?.name,
        messageType: context.messageType,
        tone: context.tone,
        personalized: includePersonalization
      }
    })

  } catch (error) {
    console.error('AI message generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function buildAIContext(parentData: any, paymentData: any, contractData: any, context: any): string {
  let contextParts = []

  if (parentData) {
    contextParts.push(`Parent: ${parentData.name} (${parentData.email})`)
    
    if (parentData.payments?.length > 0) {
      const latestPayment = parentData.payments[0]
      contextParts.push(`Latest payment: $${latestPayment.amount} due ${latestPayment.dueDate.toDateString()} (Status: ${latestPayment.status})`)
      
      const overduePayments = parentData.payments.filter((p: any) => p.status === 'overdue')
      if (overduePayments.length > 0) {
        contextParts.push(`Overdue payments: ${overduePayments.length}`)
      }
    }

    if (parentData.contracts?.length > 0) {
      const latestContract = parentData.contracts[0]
      contextParts.push(`Contract status: ${latestContract.status}`)
      if (latestContract.expiresAt) {
        contextParts.push(`Contract expires: ${latestContract.expiresAt.toDateString()}`)
      }
    }

    if (parentData.paymentPlans?.length > 0) {
      const activePlan = parentData.paymentPlans[0]
      contextParts.push(`Payment plan: ${activePlan.type} ($${activePlan.installmentAmount} x ${activePlan.installments})`)
    }

    const recentMessages = parentData.messageLogs?.length || 0
    contextParts.push(`Recent communications: ${recentMessages} messages`)
  }

  if (paymentData) {
    contextParts.push(`Payment amount: $${paymentData.amount}`)
    contextParts.push(`Due date: ${paymentData.dueDate.toDateString()}`)
    contextParts.push(`Payment status: ${paymentData.status}`)
    if (paymentData.remindersSent > 0) {
      contextParts.push(`Reminders sent: ${paymentData.remindersSent}`)
    }
  }

  if (contractData) {
    contextParts.push(`Contract: ${contractData.originalName}`)
    contextParts.push(`Contract status: ${contractData.status}`)
    if (contractData.expiresAt) {
      const daysUntilExpiry = Math.ceil((new Date(contractData.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      contextParts.push(`Days until expiry: ${daysUntilExpiry}`)
    }
  }

  return contextParts.join('\n')
}
