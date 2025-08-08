
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

    // Call the LLM API without streaming
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: messages,
        stream: false, // Changed to false
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('LLM API error:', response.status, errorBody);
      throw new Error('Failed to generate template from LLM API')
    }

    const result = await response.json();
    const templateContent = JSON.parse(result.choices[0].message.content);

    // Create the template in Convex
    const templateId = await convex.mutation(api.templates.createTemplate, {
      name: templateContent.name,
      subject: templateContent.subject || '',
      body: templateContent.body,
      category: templateContent.category || category,
      channel: templateContent.channel || channel,
      variables: templateContent.variables || [],
      isAiGenerated: true,
      isActive: true
    });

    // Fetch the created template
    const newTemplate = await convex.query(api.templates.getTemplate, {
      id: templateId
    });

    return NextResponse.json(newTemplate);

  } catch (error) {
    console.error('Template generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}
