
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    const parentId = params.id
    console.log('GET request for parent ID:', parentId)
    
    const parent = await convex.query(api.parents.getParent, { id: parentId as any });

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    const payments = await convex.query(api.payments.getPayments, { parentId: parentId as any, page: 1, limit: 50 });
    const messageLogs = await convex.query(api.messageLogs.getMessageLogs, { parentId: parentId as any, limit: 20 });

    const parentWithRelations = {
      ...parent,
      payments: payments?.payments || [],
      messageLogs: messageLogs?.messages || [],
      paymentPlans: [], // TODO: Implement payment plans if needed
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

    const updatedParent = await convex.mutation(api.parents.updateParent, {
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
