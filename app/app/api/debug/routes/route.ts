export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('testId') || 'test123'
    
    // Test various API endpoints
    const baseUrl = request.url.replace('/api/debug/routes', '')
    
    const testResults = {
      timestamp: new Date().toISOString(),
      baseUrl,
      environment: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
      tests: {} as Record<string, any>
    }

    // Test static routes
    try {
      const healthResponse = await fetch(`${baseUrl}/api/health`)
      testResults.tests.health = {
        status: healthResponse.status,
        ok: healthResponse.ok
      }
    } catch (error) {
      testResults.tests.health = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test parents list route
    try {
      const parentsResponse = await fetch(`${baseUrl}/api/parents`)
      testResults.tests.parentsList = {
        status: parentsResponse.status,
        ok: parentsResponse.ok
      }
    } catch (error) {
      testResults.tests.parentsList = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test dynamic route (this is what's failing)
    try {
      const dynamicResponse = await fetch(`${baseUrl}/api/parents/${testId}`)
      testResults.tests.parentsDynamic = {
        status: dynamicResponse.status,
        ok: dynamicResponse.ok,
        testId
      }
    } catch (error) {
      testResults.tests.parentsDynamic = {
        error: error instanceof Error ? error.message : 'Unknown error',
        testId
      }
    }

    // Test our alternative delete endpoint
    try {
      const deleteResponse = await fetch(`${baseUrl}/api/parents/delete?id=${testId}`, {
        method: 'DELETE'
      })
      testResults.tests.parentsDeleteAlternative = {
        status: deleteResponse.status,
        ok: deleteResponse.ok,
        testId
      }
    } catch (error) {
      testResults.tests.parentsDeleteAlternative = {
        error: error instanceof Error ? error.message : 'Unknown error',
        testId
      }
    }

    return NextResponse.json(testResults)
  } catch (error) {
    console.error('Debug routes error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}