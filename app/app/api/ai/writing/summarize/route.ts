
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../../lib/api-utils'
// Clerk auth
import { summarizeText } from '../../../../../lib/ai'

export async function POST(request: Request) {
  try {
    await requireAuth()
    

    const { 
      text, 
      fieldType = 'general',
      tone = 'professional',
      context = '',
      summaryLength = 'medium'
    } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required for summarization' }, { status: 400 })
    }

    const messages = [
      {
        role: "system" as const,
        content: `You are an AI writing assistant for the "Rise as One Yearly Program". Create concise, effective summaries that preserve the most important information and key points.`
      },
      {
        role: "user" as const,
        content: buildSummaryPrompt({
          text,
          fieldType,
          tone,
          context,
          summaryLength
        })
      }
    ]

    // Use OpenAI through our AI library
    const maxLength = summaryLength === 'short' ? 50 : summaryLength === 'medium' ? 150 : 300
    const aiResult = await summarizeText(text, maxLength)
    
    if (!aiResult.success) {
      throw new Error(aiResult.error || 'Failed to summarize text')
    }

    // Return the summary directly (non-streaming for simplicity)
    return NextResponse.json({
      success: true,
      summary: aiResult.summary
    })

  } catch (error) {
    console.error('AI writing summarize error:', error)
    return NextResponse.json(
      { error: 'Failed to summarize content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function buildSummaryPrompt(params: any): string {
  const { text, fieldType, tone, context, summaryLength } = params
  
  let prompt = `Summarize the following text:\n\n"${text}"\n\n`
  
  if (context) {
    prompt += `Context: ${context}\n\n`
  }
  
  prompt += `Summary requirements:\n`
  prompt += `- Field type: ${fieldType}\n`
  prompt += `- Tone: ${tone}\n`
  prompt += `- Length: ${summaryLength}\n\n`
  
  const lengthGuidelines = {
    brief: 'Create a very brief summary (1 sentence)',
    short: 'Create a short summary (2-3 sentences)',
    medium: 'Create a concise summary (1 paragraph)',
    detailed: 'Create a detailed summary (2-3 paragraphs with key points)'
  }
  
  prompt += lengthGuidelines[summaryLength as keyof typeof lengthGuidelines] || lengthGuidelines.medium
  prompt += `\n\nPreserve the most important information, key points, and actionable items while making the content more concise.`
  
  return prompt
}

function getMaxTokensForSummary(length: string): number {
  const tokenLimits = {
    brief: 50,
    short: 150,
    medium: 300,
    detailed: 600
  }
  return tokenLimits[length as keyof typeof tokenLimits] || 300
}
