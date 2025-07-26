
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../../lib/api-utils'
// Clerk auth
import { streamCompletion } from '../../../../../lib/ai'

export async function POST(request: Request) {
  try {
    await requireAuth()
    

    const { 
      prompt, 
      context, 
      fieldType, 
      tone = 'professional',
      length = 'medium',
      includePersonalization = false,
      parentData = null
    } = await request.json()

    const messages = [
      {
        role: "system" as const,
        content: getSystemPromptForFieldType(fieldType, tone)
      },
      {
        role: "user" as const,
        content: buildWritingPrompt({
          prompt,
          context,
          fieldType,
          tone,
          length,
          includePersonalization,
          parentData
        })
      }
    ]

    // Use OpenAI streaming through our AI library
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          await streamCompletion({
            messages,
            maxTokens: getMaxTokensForLength(length),
            temperature: getTempForTone(tone),
            onChunk: (content: string) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          })
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error) {
    console.error('AI writing compose error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function getSystemPromptForFieldType(fieldType: string, tone: string): string {
  const basePrompts = {
    email_subject: `You are an AI writing assistant for email subject lines in the "Rise as One Yearly Program". Create compelling, clear subject lines that encourage opens and engagement.`,
    
    email_body: `You are an AI writing assistant for email content in the "Rise as One Yearly Program". Write clear, engaging emails that maintain a ${tone} tone while being informative and actionable.`,
    
    message_body: `You are an AI writing assistant for parent communication in the "Rise as One Yearly Program". Create messages that are warm, informative, and focused on the child's development and program success.`,
    
    parent_notes: `You are an AI writing assistant for parent profile notes in the "Rise as One Yearly Program". Write concise, professional notes that capture important information about parents and their children.`,
    
    contract_notes: `You are an AI writing assistant for contract-related notes in the "Rise as One Yearly Program". Write clear, factual notes about contract status, communications, and important details.`,
    
    payment_notes: `You are an AI writing assistant for payment-related notes in the "Rise as One Yearly Program". Write professional notes about payment status, communications, and follow-up actions.`,
    
    search_query: `You are an AI writing assistant for search queries in the "Rise as One Yearly Program". Help users create effective search terms and queries to find what they need.`,
    
    settings_description: `You are an AI writing assistant for system settings and descriptions in the "Rise as One Yearly Program". Write clear, helpful descriptions and labels for configuration options.`,
    
    form_field: `You are an AI writing assistant for form fields in the "Rise as One Yearly Program". Help users complete forms with appropriate, professional content.`,
    
    general: `You are an AI writing assistant for the "Rise as One Yearly Program". Provide helpful, professional content that matches the context and purpose of the field.`
  }

  return basePrompts[fieldType as keyof typeof basePrompts] || basePrompts.general
}

function buildWritingPrompt(params: any): string {
  const { prompt, context, fieldType, tone, length, includePersonalization, parentData } = params
  
  let fullPrompt = `Write content for a ${fieldType.replace('_', ' ')} field with the following requirements:\n\n`
  
  if (prompt) {
    fullPrompt += `User request: ${prompt}\n\n`
  }
  
  if (context) {
    fullPrompt += `Context: ${context}\n\n`
  }
  
  if (parentData && includePersonalization) {
    fullPrompt += `Parent information for personalization:\n`
    fullPrompt += `- Name: ${parentData.name || 'N/A'}\n`
    if (parentData.email) fullPrompt += `- Email: ${parentData.email}\n`
    if (parentData.childName) fullPrompt += `- Child: ${parentData.childName}\n`
    if (parentData.status) fullPrompt += `- Status: ${parentData.status}\n`
    fullPrompt += `\n`
  }
  
  fullPrompt += `Requirements:\n`
  fullPrompt += `- Tone: ${tone}\n`
  fullPrompt += `- Length: ${length}\n`
  fullPrompt += `- Field type: ${fieldType}\n`
  
  const lengthGuidelines = {
    short: 'Keep it brief and concise (1-2 sentences)',
    medium: 'Provide adequate detail (2-4 sentences or 1-2 paragraphs)',
    long: 'Provide comprehensive content (multiple paragraphs)'
  }
  
  fullPrompt += `- ${lengthGuidelines[length as keyof typeof lengthGuidelines] || lengthGuidelines.medium}\n\n`
  
  fullPrompt += `Generate appropriate content that is professional, helpful, and suitable for this field type.`
  
  return fullPrompt
}

function getMaxTokensForLength(length: string): number {
  const tokenLimits = {
    short: 150,
    medium: 500,
    long: 1000
  }
  return tokenLimits[length as keyof typeof tokenLimits] || 500
}

function getTempForTone(tone: string): number {
  const temperatures = {
    professional: 0.3,
    friendly: 0.5,
    formal: 0.2,
    casual: 0.6,
    urgent: 0.4
  }
  return temperatures[tone as keyof typeof temperatures] || 0.4
}
