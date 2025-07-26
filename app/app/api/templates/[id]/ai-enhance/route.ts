
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../../lib/api-utils'
import { convexHttp } from '../../../../../lib/db'
import { api } from '../../../../../convex/_generated/api'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const {
      improvementType,
      targetAudience,
      desiredTone,
      specificInstructions
    } = body

    // Get the current template from Convex
    const template = await convexHttp.query(api.templates.getTemplate, {
      id: params.id as any
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Generate AI enhancement
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/ai/writing/improve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: template.body,
        context: `Template enhancement for ${improvementType}. Category: ${template.category}. Target audience: ${targetAudience || 'parents'}. Desired tone: ${desiredTone || 'professional'}.`,
        tone: desiredTone || 'professional',
        improvementType,
        specificInstructions: specificInstructions || `Enhance this ${template.category} template for better ${improvementType}. Keep the same core message but improve clarity, engagement, and effectiveness.`
      })
    })

    if (!response.ok) {
      throw new Error('AI enhancement failed')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let improvedContent = ''

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              break
            }
            try {
              const parsed = JSON.parse(data)
              improvedContent += parsed.content
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    if (!improvedContent.trim()) {
      throw new Error('No improved content generated')
    }

    // Create new template version in Convex
    // TODO: Implement template versioning in Convex schema
    // For now, we'll update the existing template with improved content
    await convexHttp.mutation(api.templates.updateTemplate, {
      id: template._id,
      body: improvedContent.trim()
    });

    // Get the updated template
    const updatedTemplate = await convexHttp.query(api.templates.getTemplate, {
      id: template._id
    });

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      originalContent: template.body,
      improvedContent: improvedContent.trim(),
      improvementType,
      message: 'Template enhanced successfully'
    })

  } catch (error) {
    console.error('Template AI enhancement error:', error)
    return NextResponse.json(
      { error: 'Failed to enhance template with AI' },
      { status: 500 }
    )
  }
}
