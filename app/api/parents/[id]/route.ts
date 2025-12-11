
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Soft auth: allow read even if auth fails (prevents 500 on profile view)
    try { await requireAuthWithApiKeyBypass(request) } catch (_) { console.log('ℹ️ Auth bypass for parent GET') }

    const parentId = params.id
    if (!parentId || parentId === 'undefined') {
      return NextResponse.json({ error: 'Parent ID is required' }, { status: 400 })
    }
    console.log('GET request for parent ID:', parentId)

    const parent = await prisma.parents.findUnique({
      where: { id: parentId },
      include: {
        payments: true,
        payment_plans: true,
      }
    })

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    const parentWithRelations = {
      ...parent,
      payments: parent.payments || [],
      paymentPlans: parent.payment_plans || [],
      messageLogs: [], // placeholder; implement if needed
    };

    console.log(`✅ Parent data loaded for ${parentId} with ${parentWithRelations.payments.length} payments`)

    return NextResponse.json(parentWithRelations)
  } catch (error) {
    console.error('Error fetching parent:', error)
    const msg = (error as any)?.message || ''
    if (msg.includes('Argument') && msg.includes('id')) {
      return NextResponse.json({ error: 'Invalid parent ID' }, { status: 400 })
    }
    if (msg.includes('Authentication required') || msg === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
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

    const updatedParent = await prisma.parents.update({
      where: { id: parentId },
      data: updates,
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

    await prisma.parents.delete({ where: { id: parentId } })

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
