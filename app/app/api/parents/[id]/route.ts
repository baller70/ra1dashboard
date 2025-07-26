
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Temporarily disabled for testing: await requireAuth()
    
    console.log('GET request for parent ID:', params.id)
    
    // Force a fresh query by adding a timestamp - this bypasses Convex query caching
    const timestamp = Date.now()
    console.log('Forcing fresh query at timestamp:', timestamp)
    
    // Get parent from Convex with forced refresh using new query
    const parent = await convexHttp.query(api.parents.getParentFresh, {
      id: params.id as any,
      timestamp: timestamp
    });

    console.log('Parent data from Convex query:', parent)

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    // Get related data
    const [paymentPlans, payments, messageLogs] = await Promise.all([
      // Get payment plans for this parent
      convexHttp.query(api.payments.getPayments, {
        parentId: params.id as any,
        page: 1,
        limit: 100
      }),
      // Get payments for this parent
      convexHttp.query(api.payments.getPayments, {
        parentId: params.id as any,
        page: 1,
        limit: 100
      }),
      // Get message logs - we'll need to create this query if it doesn't exist
      Promise.resolve([]) // Placeholder for now
    ]);

    // Combine the data
    const parentWithRelations = {
      ...parent,
      paymentPlans: [], // Will need to implement payment plans queries
      payments: payments.payments || [],
      messageLogs: messageLogs || [],
      _fetchedAt: timestamp // Add timestamp to verify fresh data
    };

    console.log('Returning parent data with timestamp:', parentWithRelations._fetchedAt)

    return NextResponse.json(parentWithRelations)
  } catch (error) {
    console.error('Parent fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parent' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // Temporarily disabled for testing: await requireAuth()
    
    const body = await request.json()
    console.log('PUT request body:', body)
    console.log('Updating parent ID:', params.id)
    console.log('Parent ID type:', typeof params.id)
    console.log('Parent ID length:', params.id.length)

    // First, check if the parent exists
    const existingParent = await convexHttp.query(api.parents.getParent, {
      id: params.id as any
    });

    if (!existingParent) {
      console.log('Parent not found for ID:', params.id)
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    console.log('Existing parent found:', existingParent)

    // Update parent in Convex
    const updatedParent = await convexHttp.mutation(api.parents.updateParent, {
      id: params.id as any,
      ...body
    });

    console.log('Parent updated successfully:', updatedParent)

    return NextResponse.json({
      success: true,
      parent: updatedParent,
      message: 'Parent profile updated successfully'
    })
  } catch (error) {
    console.error('Parent update error details:', error)
    const err = error as Error
    console.error('Error name:', err?.name)
    console.error('Error message:', err?.message)
    console.error('Error stack:', err?.stack)
    
    return NextResponse.json(
      { 
        error: 'Failed to update parent profile',
        details: err?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Temporarily disabled for testing: await requireAuth()
    
    console.log('DELETE request for parent ID:', params.id)

    // Delete parent from Convex
    const result = await convexHttp.mutation(api.parents.deleteParent, {
      id: params.id as any
    });

    console.log('Parent deleted successfully:', result)

    return NextResponse.json({
      success: true,
      message: 'Parent deleted successfully',
      deletedId: result.deletedId
    })
  } catch (error) {
    console.error('Parent delete error:', error)
    const err = error as Error
    return NextResponse.json(
      { 
        error: 'Failed to delete parent',
        details: err?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
