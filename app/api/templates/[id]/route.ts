
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    // Get template from Convex
    const template = await convexHttp.query(api.templates.getTemplate, {
      id: params.id as any
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // For now, return template without related data since those queries aren't implemented
    // TODO: Implement message logs, scheduled messages, and versions queries
    const templateWithRelations = {
      ...template,
      messageLogs: [],
      scheduledMessages: [],
      versions: []
    };

    return NextResponse.json(templateWithRelations)
  } catch (error) {
    console.error('Template fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const {
      name,
      subject,
      body: templateBody,
      category,
      channel,
      variables,
      isActive
    } = body

    // Update template in Convex
    await convexHttp.mutation(api.templates.updateTemplate, {
      id: params.id as any,
      name,
      subject,
      body: templateBody,
      category,
      channel,
      variables: variables || [],
      isActive: isActive !== undefined ? isActive : true
    });

    // Get updated template
    const updatedTemplate = await convexHttp.query(api.templates.getTemplate, {
      id: params.id as any
    });

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('Template update error:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    // Soft delete by setting isActive to false
    await convexHttp.mutation(api.templates.updateTemplate, {
      id: params.id as any,
      isActive: false
    });

    return NextResponse.json({ success: true, message: 'Template deleted successfully' })
  } catch (error) {
    console.error('Template deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
