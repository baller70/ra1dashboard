
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
      parentIds,
      templateId,
      subject,
      body: messageBody,
      customizePerParent = false
    } = body

    if (!parentIds || !parentIds.length || !subject || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get parent information for personalization from Convex
    const parentsResponse = await convexHttp.query(api.parents.getParents, {});
    const allParents = parentsResponse.parents;
    
    const parents = allParents.filter(parent => parentIds.includes(parent._id));

    const results = []
    const gmailUrls = []

    for (const parent of parents) {
      let personalizedSubject = subject
      let personalizedBody = messageBody

      if (customizePerParent) {
        // Replace common variables
        personalizedSubject = personalizedSubject.replace(/\{parentName\}/g, parent.name || 'Parent')
        personalizedBody = personalizedBody.replace(/\{parentName\}/g, parent.name || 'Parent')
        personalizedBody = personalizedBody.replace(/\{parentEmail\}/g, parent.email)
      }

      try {
        // Create Gmail draft for this parent
        const draft = await gmailService.createDraft({
          to: [parent.email],
          subject: personalizedSubject,
          body: personalizedBody
        })

        // Log the message (for now just log to console since message logging isn't fully implemented)
        // TODO: Implement message logging in Convex schema
        console.log('Gmail draft created for parent:', parent._id, {
          draftId: draft.draftId,
          webUrl: draft.webUrl,
          subject: personalizedSubject,
          templateId
        });

        results.push({
          parentId: parent._id,
          parentName: parent.name,
          parentEmail: parent.email,
          success: true,
          draft
        })

        gmailUrls.push(draft.webUrl)
      } catch (error) {
        console.error(`Failed to create draft for parent ${parent._id}:`, error)
        results.push({
          parentId: parent._id,
          parentName: parent.name,
          parentEmail: parent.email,
          success: false,
          error: 'Failed to create draft'
        })
      }
    }

    // Update template usage count if template was used
    if (templateId) {
      try {
        const successfulCount = results.filter(r => r.success).length;
        for (let i = 0; i < successfulCount; i++) {
          await convexHttp.mutation(api.templates.incrementTemplateUsage, {
            id: templateId as any
          });
        }
      } catch (error) {
        console.error('Failed to update template usage count:', error);
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: parentIds.length,
        successful: successCount,
        failed: failureCount
      },
      gmailUrls,
      message: `Created ${successCount} Gmail drafts successfully`
    })
  } catch (error) {
    console.error('Bulk Gmail draft creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create bulk Gmail drafts' },
      { status: 500 }
    )
  }
}
