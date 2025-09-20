
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
    
    // Generate personalized message using AI
    const messages = [
      {
        role: "system" as const,
        content: customInstructions && customInstructions.trim()
          ? `You are an intelligent assistant for the "Rise as One Yearly Program" parent communication system. The user has provided specific custom instructions that you MUST follow exactly. Your primary job is to follow the user's custom instructions while incorporating the relevant payment context.

IMPORTANT: The user's custom instructions take ABSOLUTE PRIORITY. Follow them exactly, even if they seem informal or direct.

Custom Instructions: ${customInstructions}

Context: ${aiContext}

Generate a message that follows the custom instructions exactly while incorporating the payment context (parent name, amount, due date, etc.).`
          : `You are an intelligent assistant for the "Rise as One Yearly Program" parent communication system. Generate personalized, professional messages for parents based on the provided context.

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
        content: customInstructions && customInstructions.trim()
          ? `Follow the custom instructions exactly: "${customInstructions}"

Use this payment context:
- Parent: ${context?.parentName || 'Parent'}
- Amount: $${context?.amount || 'Amount'}
- Due Date: ${context?.dueDate ? new Date(context.dueDate).toLocaleDateString() : 'Due Date'}
- Status: ${context?.status || 'Status'}

Generate the message following the custom instructions exactly. Provide in JSON format:
{
  "subject": "Subject line here",
  "body": "Message body here following the custom instructions exactly",
  "reasoning": "Brief explanation of how you followed the custom instructions",
  "suggestions": ["Alternative subject 1", "Alternative subject 2"]
}`
          : `Generate a ${context?.messageType ?? 'general'} message with the following requirements:
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

    // Parse JSON response if it's in JSON format
    let messageBody = generatedMessage
    let messageSubject = 'Payment Reminder'

    try {
      const jsonResponse = JSON.parse(generatedMessage)
      if (jsonResponse.body) {
        messageBody = jsonResponse.body
      }
      if (jsonResponse.subject) {
        messageSubject = jsonResponse.subject
      }
    } catch (e) {
      // If not JSON, use the raw message
      console.log('🔥 Not JSON format, using raw message')
    }

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
