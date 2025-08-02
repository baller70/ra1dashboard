
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'

export async function GET() {
  try {
    await requireAuth()
    
    // Return empty array since scheduled messages table isn't implemented in Convex yet
    // TODO: Implement scheduled messages table in Convex schema and create queries
    const scheduledMessages: any[] = [];

    return NextResponse.json(scheduledMessages)
  } catch (error) {
    console.error('Scheduled messages fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled messages' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('id')

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    // For now, just return success since scheduled messages functionality isn't implemented
    // TODO: Implement scheduled message cancellation in Convex
    console.log('Scheduled message cancellation requested:', messageId);

    return NextResponse.json({ 
      success: true,
      message: 'Scheduled message functionality not yet implemented'
    })
  } catch (error) {
    console.error('Cancel scheduled message error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel scheduled message' },
      { status: 500 }
    )
  }
}
