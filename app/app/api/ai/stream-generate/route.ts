
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
// Clerk auth
import { streamCompletion } from '../../../../lib/ai'

export async function POST(request: Request) {
  try {
    await requireAuth()
    

    const { prompt, context, type } = await request.json()

    const messages = [
      {
        role: "system" as const,
        content: getSystemPrompt(type)
      },
      {
        role: "user" as const,
        content: `${context ? `Context: ${JSON.stringify(context)}\n\n` : ''}${prompt}`
      }
    ]

    // Use OpenAI streaming through our AI library
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          await streamCompletion({
            messages,
            maxTokens: 3000,
            temperature: 0.7,
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
    console.error('Stream generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate stream', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function getSystemPrompt(type: string): string {
  const prompts = {
    message: `You are an AI assistant for the "Rise as One Yearly Program" parent communication system. Generate personalized, professional messages that are warm, supportive, and focused on the child's development. Always maintain a positive tone while addressing any concerns.`,
    
    analysis: `You are an AI analyst for the "Rise as One Yearly Program". Provide detailed, actionable insights based on data patterns. Focus on practical recommendations that can improve parent engagement and program outcomes.`,
    
    summary: `You are an AI summarizer for the "Rise as One Yearly Program". Create concise, informative summaries that highlight key points and actionable items. Focus on clarity and actionable insights.`,
    
    recommendation: `You are an AI advisor for the "Rise as One Yearly Program". Provide strategic recommendations based on data analysis. Focus on practical, implementable solutions that improve program efficiency and parent satisfaction.`,
    
    default: `You are an AI assistant for the "Rise as One Yearly Program". Provide helpful, accurate, and professional responses focused on program management and parent communication.`
  }

  return prompts[type as keyof typeof prompts] || prompts.default
}
