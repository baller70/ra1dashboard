export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const parentId = 'j971g9n5ve0qqsby21a0k9n1js7n7tbx';
    
    console.log('🔍 Testing direct Convex mutation call');
    console.log('🔍 Parent ID:', parentId);
    
    // Test 1: Get the parent first
    const parent = await convex.query(api.parents.getParent, { id: parentId as any });
    console.log('🔍 Current parent:', parent);
    
    // Test 2: Try the assignParentsToTeam mutation with null teamId
    try {
      const result = await convex.mutation(api.teams.assignParentsToTeam, {
        parentIds: [parentId as any]
        // Note: not passing teamId at all
      });
      console.log('✅ Mutation succeeded:', result);
      
      return NextResponse.json({
        success: true,
        message: 'Test unassign succeeded',
        result: result,
        parentBefore: parent
      });
      
    } catch (mutationError) {
      console.error('❌ Mutation failed:', mutationError);
      
      return NextResponse.json({
        success: false,
        error: 'Mutation failed',
        details: mutationError instanceof Error ? mutationError.message : String(mutationError),
        parentBefore: parent
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
