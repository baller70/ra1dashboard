
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET() {
  try {
    await requireAuth()

    // For now, return empty jobs array - background jobs not fully implemented in Convex yet
    return NextResponse.json({
      jobs: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      }
    })

  } catch (error) {
    console.error('Error fetching background jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { type, data, priority, scheduledFor, maxRetries, parentJobId } = await request.json()

    // For now, just return success - background jobs not fully implemented in Convex yet
    return NextResponse.json({
      success: true,
      job: {
        id: 'temp-' + Date.now(),
        type,
        status: 'pending',
        priority: priority || 'medium',
        scheduledFor: scheduledFor || new Date(),
        createdAt: new Date(),
        createdBy: 'user'
      }
    })

  } catch (error) {
    console.error('Error creating background job:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}
