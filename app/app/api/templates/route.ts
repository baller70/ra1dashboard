
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../lib/api-utils'
import { convexHttp } from '../../../lib/db'
import { api } from '../../../convex/_generated/api'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    // Get templates from Convex
    const result = await convexHttp.query(api.templates.getTemplates, {
      page: 1,
      limit: 100,
      isActive: true
    });

    return NextResponse.json(result.templates)
  } catch (error) {
    console.error('Templates fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    const body = await request.json()
    const {
      name,
      subject,
      body: templateBody,
      category,
      channel,
      variables,
      isAiGenerated = false
    } = body

    // Create template in Convex
    const templateId = await convexHttp.mutation(api.templates.createTemplate, {
      name,
      subject,
      body: templateBody,
      category,
      channel: channel || 'email',
      variables: variables || [],
      isAiGenerated,
      isActive: true
    });

    // Get the created template
    const template = await convexHttp.query(api.templates.getTemplate, {
      id: templateId as any
    });

    return NextResponse.json(template)
  } catch (error) {
    console.error('Template creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
