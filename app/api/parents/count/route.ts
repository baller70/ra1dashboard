export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET() {
  try {
    // Get all parents - simple and direct
    const result = await convex.query(api.parents.getParents, {
      page: 1,
      limit: 1000 // Get all parents
    });

    const totalParents = result.pagination.total;
    
    console.log(`📊 SIMPLE COUNT: ${totalParents} total parents`);
    
    return NextResponse.json({
      success: true,
      count: totalParents,
      parents: result.parents.map(p => ({ name: p.name, status: p.status }))
    });
  } catch (error) {
    console.error('Parent count error:', error);
    return NextResponse.json(
      { error: 'Failed to count parents' },
      { status: 500 }
    );
  }
}