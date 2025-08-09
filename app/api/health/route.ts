export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import Stripe from 'stripe'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'disconnected',
    stripe: 'disconnected',
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

  // Stripe connectivity check (non-authenticated ping using secret if present)
  try {
    const key = process.env.STRIPE_SECRET_KEY
    if (key) {
      const stripe = new Stripe(key, { apiVersion: '2024-06-20' })
      // Lightweight call: list balance or products with limit 1
      await stripe.balance.retrieve()
      health.stripe = 'connected'
    } else {
      health.stripe = 'missing_key'
    }
  } catch (err) {
    console.error('Stripe health check failed:', err)
    health.status = 'unhealthy'
    health.stripe = 'error'
  }

  const statusCode = health.status === 'healthy' ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
} 