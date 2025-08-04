import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'

export async function GET() {
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    
    console.log('🔍 Testing Convex connection...')
    
    // Test both functions
    const [analytics, allPayments] = await Promise.all([
      convex.query(api.payments.getPaymentAnalytics, {}),
      convex.query(api.payments.getPayments, { page: 1, limit: 100 })
    ])
    
    console.log('🔍 Analytics result:', analytics)
    console.log('🔍 All payments result:', allPayments)
    
    return NextResponse.json({
      success: true,
      data: {
        analytics,
        allPayments: {
          count: allPayments.payments.length,
          payments: allPayments.payments.map(p => ({
            name: p.parentName,
            amount: p.amount,
            status: p.status
          }))
        }
      }
    })
  } catch (error) {
    console.error('Convex test error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}