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

    console.log('🧹 Starting comprehensive cleanup of ALL test data...');

    // Run the comprehensive cleanup
    const result = await convexHttp.mutation(api.comprehensiveCleanup.removeAllTestData);

    console.log('✅ Comprehensive cleanup completed:', result);

    return NextResponse.json({
      success: true,
      message: 'All test data has been removed',
      data: result
    });

  } catch (error) {
    console.error('❌ Comprehensive cleanup failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup test data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== 'ra1-dashboard-api-key-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify no test data remains
    const verification = await convexHttp.query(api.comprehensiveCleanup.verifyNoTestData);

    return NextResponse.json({
      success: true,
      message: 'Verification complete',
      data: verification
    });

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to verify cleanup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}