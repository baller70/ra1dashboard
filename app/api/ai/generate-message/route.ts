
export const dynamic = "force-dynamic";
// Force fresh deployment - AI Reminder Prompt fix v2

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
// Clerk auth
import { AIMessageRequest } from '../../../../lib/types'

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: Request) {
  try {
    console.log('🔥 API ROUTE CALLED')

    const body: AIMessageRequest = await request.json();
    console.log('🔥 FULL REQUEST BODY:', JSON.stringify(body, null, 2))
    const { context: rawContext, customInstructions, includePersonalization, templateId } = body;
    console.log('🔥 EXTRACTED customInstructions:', customInstructions)

    const context: any = rawContext ?? {}; // Ensure we always have an object

    // Simple fallback - don't try to fetch data from Convex for now
    const parentName = context?.parentName || 'Parent'
    const amount = context?.amount || '150'
    const dueDate = context?.dueDate ? new Date(context.dueDate).toLocaleDateString() : '9/20/2025'

    console.log('🔥 PROCESSING WITH:', { parentName, amount, dueDate, customInstructions })

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

Context: Payment reminder for ${parentName}`

    let userPrompt = `Generate a ${context?.messageType ?? 'general'} message for:
- Parent: ${parentName}
- Amount: $${amount}
- Due Date: ${dueDate}
- Status: ${context.status || 'pending'}

Please provide a complete, professional message.`

    // If custom instructions are provided, modify the prompts to use them as guidance
    if (customInstructions && customInstructions.trim()) {
      console.log('🔥 CUSTOM INSTRUCTIONS FOUND:', customInstructions)

      systemPrompt = `You are an intelligent assistant for the "Rise as One Yearly Program" parent communication system. Generate a professional payment reminder message following these specific instructions: "${customInstructions.trim()}".

Make sure the message is still professional and appropriate for business communication, but incorporate the tone, urgency, and style requested in the instructions. The custom instructions should guide the overall approach and tone of the message.`

      userPrompt = `Generate a payment reminder message for:
- Parent: ${parentName}
- Amount: $${amount}
- Due Date: ${dueDate}
- Status: ${context.status || 'pending'}

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

    // Check if OpenAI API key is configured - if not, use intelligent fallback
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log('🔥 OPENAI_API_KEY not configured - using intelligent fallback')

      // Intelligent fallback: Create professional message based on custom instructions
      let fallbackMessage = ''

      if (customInstructions && customInstructions.trim()) {
        const instructions = customInstructions.trim().toLowerCase()
        // Use the simplified data we already have
        const amount = context.amount || '150'
        const dueDate = context.dueDate ? new Date(context.dueDate).toLocaleDateString() : '9/20/2025'

        // Analyze custom instructions and create appropriate message
        if (instructions.includes('urgent') || instructions.includes('asap') || instructions.includes('immediately')) {
          fallbackMessage = `${parentName}, This is an urgent reminder that your payment of $${amount} for the Rise as One Basketball Program is due on ${dueDate}. Immediate attention to this matter would be greatly appreciated. Thank you.`
        } else if (instructions.includes('firm') || instructions.includes('direct') || instructions.includes('owe')) {
          fallbackMessage = `${parentName}, This is an important reminder that your payment of $${amount} for the Rise as One Basketball Program is due on ${dueDate}. Please process this payment promptly to avoid any delays. Thank you for your attention to this matter.`
        } else if (instructions.includes('friendly') || instructions.includes('polite') || instructions.includes('gentle')) {
          fallbackMessage = `Dear ${parentName}, I hope this message finds you well! This is a friendly reminder that your payment of $${amount} for the Rise as One Basketball Program is due on ${dueDate}. We appreciate your continued support. Thank you!`
        } else if (instructions.includes('game') || instructions.includes('next game') || instructions.includes('upcoming')) {
          fallbackMessage = `${parentName}, With our upcoming game approaching, this is a reminder that your payment of $${amount} for the Rise as One Basketball Program is due on ${dueDate}. Your prompt attention would be appreciated. Thank you!`
        } else {
          // Default professional tone incorporating the custom instructions
          fallbackMessage = `${parentName}, This is a reminder that your payment of $${amount} for the Rise as One Basketball Program is due on ${dueDate}. ${instructions.includes('please') ? 'Please' : 'We would appreciate if you could'} process this payment at your earliest convenience. Thank you for your attention to this matter.`
        }
      } else {
        // Standard professional message
        fallbackMessage = `Dear ${parentName}, This is a friendly reminder that your payment of $${amount} for the Rise as One Basketball Program is due on ${dueDate}. Thank you for your prompt attention to this matter.`
      }

      console.log('🔥 FALLBACK MESSAGE:', fallbackMessage)

      return NextResponse.json({
        success: true,
        message: fallbackMessage,
        subject: 'Payment Reminder',
        context: {
          parentName: parentName,
          messageType: context.messageType,
          tone: customInstructions ? 'custom' : 'professional',
          personalized: includePersonalization,
          fallback: true
        }
      })
    }

    // If OpenAI is configured, use it
    try {
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
          parentName: parentName,
          messageType: context.messageType,
          tone: context.tone,
          personalized: includePersonalization
        }
      })
    } catch (openaiError) {
      console.error('🔥 OpenAI API Error:', openaiError)

      // Fallback to intelligent message generation if OpenAI fails
      const fallbackParentName = parentName
      const fallbackAmount = amount
      const fallbackDueDate = dueDate

      const fallbackMessage = customInstructions && customInstructions.trim()
        ? `${fallbackParentName}, This is an important reminder that your payment of $${fallbackAmount} for the Rise as One Basketball Program is due on ${fallbackDueDate}. Please process this payment promptly. Thank you for your attention to this matter.`
        : `Dear ${fallbackParentName}, This is a friendly reminder that your payment of $${fallbackAmount} for the Rise as One Basketball Program is due on ${fallbackDueDate}. Thank you for your prompt attention to this matter.`

      return NextResponse.json({
        success: true,
        message: fallbackMessage,
        subject: 'Payment Reminder',
        context: {
          parentName: fallbackParentName,
          messageType: context.messageType,
          tone: customInstructions ? 'custom' : 'professional',
          personalized: includePersonalization,
          fallback: true
        }
      })
    }

  } catch (error) {
    console.error('AI message generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


