import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { requireAuthWithApiKeyBypass } from '@/lib/api-utils'

const convexHttp = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    console.log('🗑️ Starting complete data reset...')
    
    // Get all parents and payments first for logging
    const allParents = await convexHttp.query(api.parents.getParents, { limit: 1000 })
    const allPayments = await convexHttp.query(api.payments.getPayments, { limit: 1000 })
    
    console.log(`📊 Found ${allParents.parents?.length || 0} parents and ${allPayments.payments?.length || 0} payments to delete`)
    
    let deletedParents = 0
    let deletedPayments = 0
    
    // Delete all payments first
    console.log('🔄 Deleting all payments...')
    for (const payment of allPayments.payments || []) {
      try {
        await convexHttp.mutation(api.payments.deletePayment, {
          id: payment._id as any
        })
        deletedPayments++
      } catch (error) {
        console.error(`Failed to delete payment ${payment._id}:`, error)
      }
    }
    
    // Delete all parents
    console.log('🔄 Deleting all parents...')
    for (const parent of allParents.parents || []) {
      try {
        await convexHttp.mutation(api.parents.deleteParent, {
          id: parent._id as any
        })
        deletedParents++
      } catch (error) {
        console.error(`Failed to delete parent ${parent._id}:`, error)
      }
    }
    
    console.log(`✅ Data reset complete: ${deletedParents} parents and ${deletedPayments} payments deleted`)
    
    return NextResponse.json({
      success: true,
      message: 'All data has been successfully deleted',
      deletedParents,
      deletedPayments
    })
    
  } catch (error) {
    console.error('❌ Error resetting data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to reset data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}