
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

    console.log("Attempting to generate AI template with prompt:", prompt);
    try {
      // Re-deploying to ensure Vercel picks up the new OpenAI API Key
      // Call the OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          stream: false,
          max_tokens: 1000,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('LLM API error:', response.status, errorBody);
        throw new Error(`LLM API failed with status ${response.status}: ${errorBody}`);
      }

      const result = await response.json();
      const templateContentString = result.choices[0].message.content;
      
      let templateContent;
      try {
        templateContent = JSON.parse(templateContentString);
      } catch (e) {
        console.error('Failed to parse LLM response JSON:', templateContentString);
        throw new Error('Failed to parse JSON from LLM response.');
      }

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

      console.log("Successfully created AI template:", newTemplate._id);
      return NextResponse.json(newTemplate);

    } catch (error: any) {
      console.error('Detailed error in AI template generation:', error.message);
      return NextResponse.json(
        { error: `Failed to generate template: ${error.message}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Template generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}
