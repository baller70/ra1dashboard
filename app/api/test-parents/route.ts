export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { requireAuthWithApiKeyBypass } from '../../../lib/api-utils'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🧪 Test Parents API: Testing all parent queries...');

    // Test both parent functions
    const [paginatedParents, allParents] = await Promise.all([
      convex.query(api.parents.getParents, { page: 1, limit: 1000 }),
      convex.query(api.parents.getAllParents, {})
    ]);

    console.log('🧪 Test Parents API: Paginated parents result:', JSON.stringify(paginatedParents, null, 2));
    console.log('🧪 Test Parents API: All parents result:', JSON.stringify(allParents, null, 2));

    return NextResponse.json({
      success: true,
      data: {
        paginatedParents: {
          count: paginatedParents.parents.length,
          total: paginatedParents.pagination.total,
          parents: paginatedParents.parents.map(p => ({
            id: p._id,
            name: p.name,
            email: p.email,
            status: p.status
          }))
        },
        allParents: {
          count: allParents.length,
          parents: allParents.map(p => ({
            id: p._id,
            name: p.name,
            email: p.email,
            status: p.status
          }))
        }
      }
    });
  } catch (error) {
    console.error('Test Parents API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test parent functions' },
      { status: 500 }
    );
  }
}