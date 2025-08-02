
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../lib/api-utils'

export async function GET(request: Request) {
  try {
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Return empty array since recurring messages table isn't implemented in Convex yet
    // TODO: Implement recurring messages table in Convex schema and create queries
    const recurringMessages: any[] = [];

    return NextResponse.json({
      recurringMessages,
      pagination: {
        total: 0,
        limit,
        offset,
        hasMore: false
      }
    })
  } catch (error) {
    console.error('Recurring messages fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json()
    
    // For now, just return success since recurring messages functionality isn't implemented
    // TODO: Implement recurring messages creation in Convex
    console.log('Recurring message creation requested:', body);

    return NextResponse.json({
      success: true,
      recurringMessage: {
        id: 'temp-' + Date.now(),
        ...body,
        createdAt: new Date(),
        isActive: true,
        status: 'active'
      },
      message: 'Recurring messages functionality not yet implemented'
    })
  } catch (error) {
    console.error('Recurring message creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create recurring message' },
      { status: 500 }
    )
  }
}
