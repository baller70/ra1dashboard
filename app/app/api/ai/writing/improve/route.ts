
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../../lib/api-utils'
// Clerk auth
import { improveText } from '../../../../../lib/ai'

export async function POST(request: Request) {
  try {
    await requireAuth()
    

    const { 
      text, 
      improvementType = 'overall',
      targetTone = 'professional',
      fieldType = 'general',
      context = ''
    } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required for improvement' }, { status: 400 })
    }

    const messages = [
      {
        role: "system" as const,
        content: `You are an AI writing assistant for the "Rise as One Yearly Program". Improve existing text while maintaining the original intent and key information. Focus on clarity, professionalism, and effectiveness.`
      },
      {
        role: "user" as const,
        content: buildImprovementPrompt({
          text,
          improvementType,
          targetTone,
          fieldType,
          context
        })
      }
    ]

    // Use OpenAI through our AI library
    const aiResult = await improveText(text, `Improvement type: ${improvementType}. Target tone: ${targetTone}. Field type: ${fieldType}. Context: ${context}`)
    
    if (!aiResult.success) {
      throw new Error(aiResult.error || 'Failed to improve text')
    }

    // Return the improved text directly (non-streaming for simplicity)
    return NextResponse.json({
      success: true,
      improvedText: aiResult.improvedText
    })

  } catch (error) {
    console.error('AI writing improve error:', error)
    return NextResponse.json(
      { error: 'Failed to improve content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function buildImprovementPrompt(params: any): string {
  const { text, improvementType, targetTone, fieldType, context } = params
  
  let prompt = `Improve the following text:\n\n"${text}"\n\n`
  
  if (context) {
    prompt += `Context: ${context}\n\n`
  }
  
  prompt += `Improvement requirements:\n`
  prompt += `- Field type: ${fieldType}\n`
  prompt += `- Target tone: ${targetTone}\n`
  prompt += `- Improvement focus: ${improvementType}\n\n`
  
  const improvementInstructions = {
    clarity: 'Focus on making the text clearer and easier to understand',
    grammar: 'Fix grammar, spelling, and punctuation errors',
    tone: `Adjust the tone to be more ${targetTone}`,
    conciseness: 'Make the text more concise while preserving key information',
    engagement: 'Make the text more engaging and compelling',
    professionalism: 'Enhance the professional quality of the text',
    overall: 'Improve clarity, grammar, tone, and overall effectiveness'
  }
  
  prompt += improvementInstructions[improvementType as keyof typeof improvementInstructions] || improvementInstructions.overall
  prompt += `\n\nProvide only the improved version of the text without additional commentary.`
  
  return prompt
}
