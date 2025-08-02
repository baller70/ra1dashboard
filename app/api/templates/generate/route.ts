
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const { prompt, category = 'general', channel = 'email' } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Create messages for the LLM API
    const messages = [
      {
        role: "system",
        content: `You are an expert at creating professional communication templates for a youth basketball program called "Rise as One Yearly Program". 
        
        Create a professional message template based on the user's request. The template should:
        - Be appropriate for communicating with parents of youth basketball players
        - Use a professional but friendly tone
        - Include relevant placeholder variables in {variableName} format
        - Be suitable for ${channel} communication
        - Fall under the "${category}" category
        
        Common variables you can use: {parentName}, {childName}, {amount}, {dueDate}, {programName}, {coachName}, {practiceTime}, {gameDate}
        
        Respond with a JSON object containing:
        {
          "name": "Template name (4-6 words)",
          "subject": "Email subject line (if email)",
          "body": "Message body with {variables}",
          "variables": ["array", "of", "variable", "names", "used"],
          "category": "${category}",
          "channel": "${channel}"
        }
        
        Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`
      },
      {
        role: "user",
        content: prompt
      }
    ]

    // Call the LLM API with streaming
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: messages,
        stream: true,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate template')
    }

    // Create a readable stream to handle the response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('No response reader available')
          }

          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  // Process the complete JSON response
                  try {
                    const templateData = JSON.parse(buffer)
                    
                    // Create the template in Convex
                    const templateId = await convexHttp.mutation(api.templates.createTemplate, {
                      name: templateData.name,
                      subject: templateData.subject || '',
                      body: templateData.body,
                      category: templateData.category || category,
                      channel: templateData.channel || channel,
                      variables: templateData.variables || [],
                      isAiGenerated: true,
                      isActive: true
                    });

                    // Fetch the created template
                    const template = await convexHttp.query(api.templates.getTemplate, {
                      id: templateId
                    });

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ template })}\n\n`))
                  } catch (e) {
                    console.error('Error parsing final JSON:', e)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to parse generated template' })}\n\n`))
                  }

                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  controller.close()
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  buffer += parsed.content || ''
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: parsed.content || '' })}\n\n`))
                } catch (e) {
                  // Skip invalid JSON chunks
                }
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
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
    console.error('Template generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}
