
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../lib/api-utils'
import { convexHttp } from '../../../lib/db'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'

export async function GET(request: Request) {
  try {
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const parentId = searchParams.get('parentId')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const status = searchParams.get('status')

    const result = await convexHttp.query(api.aiRecommendations.getAiRecommendations, {
      page,
      limit,
      parentId: parentId ? parentId as Id<"parents"> : undefined,
      type: type || undefined,
      priority: priority || undefined,
      status: status || undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI recommendations fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI recommendations' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const {
      parentId,
      paymentId,
      contractId,
      type,
      priority,
      title,
      description,
      recommendation,
      aiConfidence,
      dataPoints,
      actions
    } = body

    // Basic validation
    if (!type || !title || !description || !recommendation) {
      return NextResponse.json(
        { error: 'Type, title, description, and recommendation are required' },
        { status: 400 }
      )
    }

    const recommendationId = await convexHttp.mutation(api.aiRecommendations.createAiRecommendation, {
      parentId: parentId ? parentId as Id<"parents"> : undefined,
      paymentId: paymentId ? paymentId as Id<"payments"> : undefined,
      contractId: contractId ? contractId as Id<"contracts"> : undefined,
      type,
      priority: priority || 'normal',
      title,
      description,
      recommendation,
      aiConfidence: aiConfidence || 85,
      dataPoints: dataPoints || {},
      actions: actions || [],
    })

    return NextResponse.json({
      success: true,
      recommendationId,
      message: 'AI recommendation created successfully'
    })
  } catch (error) {
    console.error('AI recommendation creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create AI recommendation' },
      { status: 500 }
    )
  }
}
