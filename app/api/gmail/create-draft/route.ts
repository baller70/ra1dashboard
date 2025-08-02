
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { gmailService } from '../../../../lib/gmail'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const {
      to,
      subject,
      body: messageBody,
      templateId,
      parentIds
    } = body

    if (!to || !subject || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create Gmail draft
    const draft = await gmailService.createDraft({
      to: Array.isArray(to) ? to : [to],
      subject,
      body: messageBody
    })

    // Log the message creation (for now just log to console since message logging isn't fully implemented)
    // TODO: Implement message logging in Convex schema
    if (parentIds && parentIds.length > 0) {
      console.log('Gmail draft created for parents:', parentIds, {
        draftId: draft.draftId,
        webUrl: draft.webUrl,
        subject,
        templateId
      });
    }

    // Update template usage count if template was used
    if (templateId) {
      try {
        await convexHttp.mutation(api.templates.incrementTemplateUsage, {
          id: templateId as any
        });
      } catch (error) {
        console.error('Failed to update template usage count:', error);
      }
    }

    return NextResponse.json({
      success: true,
      draft,
      message: 'Gmail draft created successfully'
    })
  } catch (error) {
    console.error('Gmail draft creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create Gmail draft' },
      { status: 500 }
    )
  }
}
