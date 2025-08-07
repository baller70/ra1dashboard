export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'
import {
  requireAuthWithApiKeyBypass,
  createSuccessResponse
} from '../../../../lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🔍 DEBUG: Getting BOTH filtered and unfiltered parents from Convex...')
    
    // Get ALL parents (unfiltered)
    const allParentsResponse = await convexHttp.query(api.parents.getParents, { 
      page: 1, 
      limit: 1000 
    })
    
    // Get ACTIVE parents (filtered by status='active')
    const activeParentsResponse = await convexHttp.query(api.parents.getParents, { 
      page: 1, 
      limit: 1000,
      status: 'active'
    })
    
    const allParents = allParentsResponse.parents || []
    const activeParents = activeParentsResponse.parents || []
    
    console.log(`📊 DIRECT CONVEX QUERY RESULTS:`)
    console.log(`   Total parents (unfiltered): ${allParents.length}`)
    console.log(`   Active parents (filtered): ${activeParents.length}`)
    
    allParents.forEach((parent: any, index: number) => {
      console.log(`   ${index + 1}. ${parent.name} (${parent.email}) - ID: ${parent._id}`)
    })

    return createSuccessResponse({
      // Both counts for comparison
      totalParents: allParents.length,
      activeParents: activeParents.length,
      
      // Both lists for comparison
      allParents: allParents.map((p: any) => ({
        _id: p._id,
        name: p.name,
        email: p.email,
        status: p.status,
        createdAt: p.createdAt
      })),
      
      activeParentsList: activeParents.map((p: any) => ({
        _id: p._id,
        name: p.name,
        email: p.email,
        status: p.status,
        createdAt: p.createdAt
      }))
    })

  } catch (error) {
    console.error('💥 Debug parents error:', error)
    return NextResponse.json({ error: 'Debug failed: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}