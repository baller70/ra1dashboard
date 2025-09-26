export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const parentId = params.id;
    console.log('🔍 Unassigning parent:', parentId);

    // Simple direct patch to remove team assignment
    await convex.mutation(api.parents.updateParent, {
      id: parentId as any,
      teamId: undefined
    });

    console.log('✅ Successfully unassigned parent:', parentId);

    return NextResponse.json({
      success: true,
      message: 'Parent successfully removed from team'
    });

  } catch (error) {
    console.error('❌ Error unassigning parent:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to unassign parent from team',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
