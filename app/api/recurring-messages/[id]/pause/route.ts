
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../../lib/api-utils'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const { reason } = body

    // For now, just return success since recurring messages functionality isn't implemented
    // TODO: Implement recurring message pause/resume in Convex
    console.log('Recurring message pause requested:', params.id, { reason });

    return NextResponse.json({
      id: params.id,
      isActive: false,
      pausedAt: new Date(),
      pausedReason: reason || 'Paused by user',
      message: 'Recurring messages functionality not yet implemented'
    })
  } catch (error) {
    console.error('Recurring message pause error:', error)
    return NextResponse.json(
      { error: 'Failed to pause recurring message' },
      { status: 500 }
    )
  }
}
