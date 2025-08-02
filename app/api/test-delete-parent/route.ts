export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../lib/api-utils'
import { cachedConvex } from '../../../lib/db-cache'
import { api } from '../../../convex/_generated/api'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TEST DELETE PARENT - Starting test')
    
    // Test authentication
    try {
      await requireAuthWithApiKeyBypass(request)
      console.log('✅ Authentication passed')
    } catch (authError) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json({
        error: 'Authentication failed',
        details: authError instanceof Error ? authError.message : 'Unknown auth error'
      }, { status: 401 })
    }
    
    const { parentId } = await request.json()
    
    if (!parentId) {
      return NextResponse.json({
        error: 'Parent ID is required',
        received: { parentId }
      }, { status: 400 })
    }
    
    console.log('🧪 Testing delete for parent ID:', parentId)
    
    // First, check if parent exists
    try {
      const parent = await cachedConvex.query(api.parents.getParent, {
        id: parentId as any
      });
      
      if (!parent) {
        console.log('❌ Parent not found in database')
        return NextResponse.json({
          error: 'Parent not found',
          parentId,
          step: 'parent_lookup'
        }, { status: 404 })
      }
      
      console.log('✅ Parent found:', parent.name)
      
      // Now try to delete
      const deleteResult = await cachedConvex.mutation(api.parents.deleteParent, {
        id: parentId as any
      });
      
      console.log('✅ Delete result:', deleteResult)
      
      return NextResponse.json({
        success: true,
        message: 'Parent deleted successfully in test',
        parentId,
        parentName: parent.name,
        deleteResult
      })
      
    } catch (convexError) {
      console.log('❌ Convex operation failed:', convexError)
      return NextResponse.json({
        error: 'Database operation failed',
        details: convexError instanceof Error ? convexError.message : 'Unknown database error',
        parentId,
        step: 'convex_operation'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Test delete parent error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}