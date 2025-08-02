
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { reason, feedback } = await request.json()

    // For now, just return success - AI recommendations not fully implemented in Convex yet
    return NextResponse.json({
      success: true,
      message: 'Recommendation dismissed'
    })

  } catch (error) {
    console.error('Error dismissing AI recommendation:', error)
    return NextResponse.json(
      { error: 'Failed to dismiss recommendation' },
      { status: 500 }
    )
  }
}
