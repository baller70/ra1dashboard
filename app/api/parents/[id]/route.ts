
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { cachedConvex, batchQueries } from '../../../../lib/db-cache'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    const parentId = params.id
    console.log('GET request for parent ID:', parentId)
    
    // Use cached query for better performance
    const cacheKey = `parent_detail_${parentId}`
    
    // Get parent from Convex with caching (30s TTL for parent data)
    const parent = await cachedConvex.query(
      api.parents.getParent, 
      { id: parentId as any },
      `parent_${parentId}`,
      30000 // 30 second cache
    );

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    // Use batch queries for better performance - avoid duplicate payment queries
    const queries = [
      {
        query: api.payments.getPayments,
        args: { parentId: parentId as any, page: 1, limit: 50 }, // Reduced limit for faster response
        key: `payments_${parentId}`
      },
      {
        query: api.messageLogs.getMessageLogs,
        args: { parentId: parentId as any, limit: 20 }, // Limited for performance
        key: `messages_${parentId}`
      }
    ];

    const [paymentsResult, messageLogsResult] = await batchQueries(
      cachedConvex.convex,
      queries,
      { concurrency: 2, timeout: 5000 } // 5 second timeout
    );

    // Combine the data efficiently
    const parentWithRelations = {
      ...parent,
      payments: (paymentsResult as any)?.payments || [],
      messageLogs: (messageLogsResult as any)?.messages || [],
      paymentPlans: [], // TODO: Implement payment plans if needed
      _fetchedAt: Date.now(),
      _cached: true
    };

    console.log(`✅ Parent data loaded for ${parentId} with ${parentWithRelations.payments.length} payments`)

    return NextResponse.json(parentWithRelations)
  } catch (error) {
    console.error('Error fetching parent:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parent data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    const parentId = params.id
    const updates = await request.json()
    
    console.log('PUT request for parent ID:', parentId, 'with updates:', updates)

    // Update parent using cached client (this will clear cache)
    const updatedParent = await cachedConvex.mutation(api.parents.updateParent, {
      id: parentId as any,
      ...updates
    });

    if (!updatedParent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    console.log('✅ Parent updated successfully:', parentId)

    return NextResponse.json(updatedParent)
  } catch (error) {
    console.error('Error updating parent:', error)
    return NextResponse.json(
      { error: 'Failed to update parent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    const parentId = params.id
    console.log('DELETE request for parent ID:', parentId)

    // Delete parent using direct Convex client to avoid cache issues
    await convex.mutation(api.parents.deleteParent, {
      id: parentId as any
    });

    console.log('✅ Parent deleted successfully:', parentId)

    return NextResponse.json({ success: true, message: 'Parent deleted successfully' })
  } catch (error) {
    console.error('Error deleting parent:', error)
    return NextResponse.json(
      { error: 'Failed to delete parent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
