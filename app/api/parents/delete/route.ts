export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    const { parentId } = await request.json()
    
    if (!parentId) {
      return NextResponse.json(
        { error: 'Parent ID is required' },
        { status: 400 }
      )
    }
    
    console.log('DELETE request for parent ID via POST:', parentId)

    // Delete parent using direct Convex client
    await convex.mutation(api.parents.deleteParent, {
      id: parentId as any
    });

    console.log('✅ Parent deleted successfully via POST:', parentId)

    return NextResponse.json({ 
      success: true, 
      message: 'Parent deleted successfully',
      parentId 
    })
  } catch (error) {
    console.error('Error deleting parent via POST:', error)
    return NextResponse.json(
      { error: 'Failed to delete parent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('id')
    
    if (!parentId) {
      return NextResponse.json(
        { error: 'Parent ID is required as query parameter' },
        { status: 400 }
      )
    }
    
    console.log('DELETE request for parent ID via query param:', parentId)

    // Delete parent using direct Convex client
    await convex.mutation(api.parents.deleteParent, {
      id: parentId as any
    });

    console.log('✅ Parent deleted successfully via query param:', parentId)

    return NextResponse.json({ 
      success: true, 
      message: 'Parent deleted successfully',
      parentId 
    })
  } catch (error) {
    console.error('Error deleting parent via query param:', error)
    return NextResponse.json(
      { error: 'Failed to delete parent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
