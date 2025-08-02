export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'disconnected',
    version: '1.0.0'
  }

  try {
    // Test Convex connection by querying a simple table
    const testQuery = await convex.query(api.parents.getParents, { limit: 1 })
    health.database = 'connected'
  } catch (error) {
    console.error('Database health check failed:', error)
    health.status = 'unhealthy'
    health.database = 'error'
  }

  const statusCode = health.status === 'healthy' ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
} 