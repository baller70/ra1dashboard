export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🔍 CHECKING ALL DATA SOURCES...')
    
    // Direct Convex queries
    const directConvexParents = await convexHttp.query(api.parents.getParents, { 
      page: 1, 
      limit: 1000 
    })
    
    // Filtered Convex queries
    const filteredConvexParents = await convexHttp.query(api.parents.getParents, { 
      page: 1, 
      limit: 1000,
      status: 'active'
    })
    
    // Get raw parents directly from Convex (using a different approach)
    let rawParents = []
    try {
      // Try to get raw parents directly
      rawParents = await convexHttp.query(api.parents.getAllParentsRaw, {})
    } catch (error) {
      console.error('Failed to get raw parents:', error)
      rawParents = []
    }
    
    console.log(`📊 DATA CHECK RESULTS:`)
    console.log(`   Direct Convex query: ${directConvexParents.parents.length} parents`)
    console.log(`   Filtered Convex query: ${filteredConvexParents.parents.length} parents`)
    console.log(`   Raw Convex data: ${rawParents.length} parents`)
    
    return NextResponse.json({
      success: true,
      data: {
        directConvexParents: {
          count: directConvexParents.parents.length,
          parents: directConvexParents.parents.map((p: any) => ({
            _id: p._id,
            name: p.name,
            email: p.email,
            status: p.status,
            createdAt: p.createdAt
          }))
        },
        filteredConvexParents: {
          count: filteredConvexParents.parents.length,
          parents: filteredConvexParents.parents.map((p: any) => ({
            _id: p._id,
            name: p.name,
            email: p.email,
            status: p.status,
            createdAt: p.createdAt
          }))
        },
        rawParents: {
          count: rawParents.length,
          parents: rawParents.map((p: any) => ({
            _id: p._id,
            name: p.name,
            email: p.email,
            status: p.status,
            createdAt: p.createdAt
          }))
        }
      }
    })

  } catch (error) {
    console.error('💥 Data check error:', error)
    return NextResponse.json({ error: 'Data check failed: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}