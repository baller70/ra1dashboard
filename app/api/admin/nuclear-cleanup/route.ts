import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convexHttp = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== 'ra1-dashboard-api-key-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚨 NUCLEAR CLEANUP: Deleting ALL test data from database...');

    // Run the nuclear cleanup that actually deletes test data
    const result = await convexHttp.mutation(api.actualCleanup.deleteAllTestData);

    console.log('✅ Nuclear cleanup completed:', result);

    return NextResponse.json({
      success: true,
      message: 'All test data has been PERMANENTLY DELETED from database',
      data: result
    });

  } catch (error) {
    console.error('❌ Nuclear cleanup failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete test data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}