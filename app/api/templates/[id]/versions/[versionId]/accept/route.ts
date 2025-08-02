
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../../../../lib/api-utils'

export async function POST(request: Request, { params }: { params: { id: string; versionId: string } }) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const { feedback } = body

    // For now, just return success since template versioning functionality isn't implemented
    // TODO: Implement template versioning acceptance in Convex
    console.log('Template version acceptance requested:', params, { feedback });

    return NextResponse.json({
      success: true,
      message: 'Template version accepted (mock) - versioning functionality not yet implemented'
    })

  } catch (error) {
    console.error('Template version acceptance error:', error)
    return NextResponse.json(
      { error: 'Failed to accept template version' },
      { status: 500 }
    )
  }
}
