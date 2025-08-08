export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'
import {
  requireAuthWithApiKeyBypass,
  createSuccessResponse
} from '../../../../lib/api-utils'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🔍 DEBUG: Getting ALL parents directly from Convex...')
    
    // Get parents using the SAME query the dashboard uses
    const parentsResponse = await convex.query(api.parents.getParents, { 
      page: 1, 
      limit: 1000 
    })
    
    const allParents = parentsResponse.parents || []
    
    console.log(`📊 DIRECT CONVEX QUERY RESULTS:`)
    console.log(`   Total parents found: ${allParents.length}`)
    
    allParents.forEach((parent: any, index: number) => {
      console.log(`   ${index + 1}. ${parent.name} (${parent.email}) - ID: ${parent._id}`)
    })

    return createSuccessResponse({
      totalParents: allParents.length,
      parents: allParents.map((p: any) => ({
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
