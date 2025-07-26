
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../../lib/api-utils'
// Clerk auth
import { completeText } from '../../../../../lib/ai'

export async function POST(request: Request) {
  try {
    await requireAuth()
    

    const { 
      partialText, 
      fieldType = 'general',
      tone = 'professional',
      context = '',
      maxLength = 'medium'
    } = await request.json()

    if (!partialText?.trim()) {
      return NextResponse.json({ error: 'Partial text is required for completion' }, { status: 400 })
    }

    const messages = [
      {
        role: "system" as const,
        content: `You are an AI writing assistant for the "Rise as One Yearly Program". Complete partial text in a natural, coherent way that maintains the original style and intent.`
      },
      {
        role: "user" as const,
        content: buildCompletionPrompt({
          partialText,
          fieldType,
          tone,
          context,
          maxLength
        })
      }
    ]

    // Use OpenAI through our AI library
    const aiResult = await completeText(partialText, context)
    
    if (!aiResult.success) {
      throw new Error(aiResult.error || 'Failed to complete text')
    }

    // Return the completed text directly (non-streaming for simplicity)
    return NextResponse.json({
      success: true,
      completion: aiResult.completion
    })

  } catch (error) {
    console.error('AI writing complete error:', error)
    return NextResponse.json(
      { error: 'Failed to complete content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function buildCompletionPrompt(params: any): string {
  const { partialText, fieldType, tone, context, maxLength } = params
  
  let prompt = `Complete the following partial text in a natural, coherent way:\n\n"${partialText}"\n\n`
  
  if (context) {
    prompt += `Context: ${context}\n\n`
  }
  
  prompt += `Requirements:\n`
  prompt += `- Field type: ${fieldType}\n`
  prompt += `- Tone: ${tone}\n`
  prompt += `- Maximum length: ${maxLength}\n`
  prompt += `- Maintain the original style and intent\n`
  prompt += `- Ensure the completion flows naturally from the existing text\n\n`
  
  const lengthGuidelines = {
    short: 'Complete with just a few words or one sentence',
    medium: 'Complete with 1-2 additional sentences',
    long: 'Complete with multiple sentences as needed'
  }
  
  prompt += lengthGuidelines[maxLength as keyof typeof lengthGuidelines] || lengthGuidelines.medium
  prompt += `\n\nProvide only the completion text without repeating the original partial text.`
  
  return prompt
}

function getMaxTokensForLength(length: string): number {
  const tokenLimits = {
    short: 100,
    medium: 300,
    long: 600
  }
  return tokenLimits[length as keyof typeof tokenLimits] || 300
}
