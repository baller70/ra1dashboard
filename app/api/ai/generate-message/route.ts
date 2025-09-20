
export const dynamic = "force-dynamic";
// Force fresh deployment - AI Reminder Prompt fix v2

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
// Clerk auth
import { AIMessageRequest } from '../../../../lib/types'
import { generateMessage } from '../../../../lib/ai'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    
    // Build AI messages with custom instructions support
    console.log('🔥 API CALLED - customInstructions:', customInstructions)

    let systemPrompt = `You are an intelligent assistant for the "Rise as One Yearly Program" parent communication system. Generate personalized, professional messages for parents based on the provided context.

Guidelines:
- Use a ${context?.tone ?? 'friendly'} tone
- Message type: ${context?.messageType ?? 'general'}
- Urgency level: ${context?.urgencyLevel ?? 3}/5
- ${includePersonalization ? 'Include personal details when relevant' : 'Keep message general'}
- Always be respectful and supportive
- Focus on the child's development and program benefits
- Include clear next steps or call-to-action when appropriate

Context: ${aiContext}`

    let userPrompt = `Generate a ${context?.messageType ?? 'general'} message for:
- Parent: ${parentData?.name || 'Parent'}
- Amount: $${context.amount || paymentData?.amount || 'N/A'}
- Due Date: ${context.dueDate ? new Date(context.dueDate).toLocaleDateString() : paymentData?.dueDate ? new Date(paymentData.dueDate).toLocaleDateString() : 'N/A'}
- Status: ${context.status || paymentData?.status || 'pending'}

Please provide a complete, professional message.`

    // If custom instructions are provided, modify the prompts to use them as guidance
    if (customInstructions && customInstructions.trim()) {
      console.log('🔥 CUSTOM INSTRUCTIONS FOUND:', customInstructions)

      systemPrompt = `You are an intelligent assistant for the "Rise as One Yearly Program" parent communication system. Generate a professional payment reminder message following these specific instructions: "${customInstructions.trim()}".

Make sure the message is still professional and appropriate for business communication, but incorporate the tone, urgency, and style requested in the instructions. The custom instructions should guide the overall approach and tone of the message.`

      userPrompt = `Generate a payment reminder message for:
- Parent: ${parentData?.name || 'Parent'}
- Amount: $${context.amount || paymentData?.amount || 'N/A'}
- Due Date: ${context.dueDate ? new Date(context.dueDate).toLocaleDateString() : paymentData?.dueDate ? new Date(paymentData.dueDate).toLocaleDateString() : 'N/A'}
- Status: ${context.status || paymentData?.status || 'pending'}

Follow these custom instructions: "${customInstructions.trim()}"

Create a complete, professional message that incorporates the requested tone and style while maintaining appropriate business communication standards. Do not just copy the instructions - use them as guidance to create a proper payment reminder message.`
    }

    // Build messages array for OpenAI
    const messages = [
      {
        role: "system" as const,
        content: systemPrompt
      },
      {
        role: "user" as const,
        content: userPrompt
      }
    ]

    console.log('🔥 SYSTEM PROMPT:', systemPrompt)
    console.log('🔥 USER PROMPT:', userPrompt)
    console.log('🔥 MESSAGES ARRAY:', JSON.stringify(messages, null, 2))

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.error('🔥 OPENAI_API_KEY not configured properly')

      // Fallback: Generate a simple message without AI
      const fallbackMessage = customInstructions && customInstructions.trim()
        ? `${customInstructions.trim()} Kevin, your payment of $${context.amount || paymentData?.amount || 'N/A'} is due on ${context.dueDate ? new Date(context.dueDate).toLocaleDateString() : paymentData?.dueDate ? new Date(paymentData.dueDate).toLocaleDateString() : 'N/A'}.`
        : `Dear ${parentData?.name || 'Parent'}, this is a friendly reminder that your payment of $${context.amount || paymentData?.amount || 'N/A'} is due on ${context.dueDate ? new Date(context.dueDate).toLocaleDateString() : paymentData?.dueDate ? new Date(paymentData.dueDate).toLocaleDateString() : 'N/A'}. Thank you for your prompt attention to this matter.`

      return NextResponse.json({
        success: true,
        message: fallbackMessage,
        subject: 'Payment Reminder',
        context: {
          parentName: parentData?.name,
          messageType: context.messageType,
          tone: customInstructions ? 'custom' : 'professional',
          personalized: includePersonalization,
          fallback: true
        }
      })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 400,
      temperature: 0.7,
    })

    const generatedMessage = completion.choices[0]?.message?.content
    console.log('🔥 OPENAI RESPONSE:', generatedMessage)

    if (!generatedMessage) {
      throw new Error('No message generated from OpenAI')
    }

    // Use the generated message directly
    const messageBody = generatedMessage.trim()
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
