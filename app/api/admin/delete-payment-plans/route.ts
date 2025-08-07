export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'
import {
  requireAuthWithApiKeyBypass,
  createErrorResponse,
  createSuccessResponse,
  ApiErrors
} from '../../../../lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🗑️ DELETING ALL TEST PAYMENT PLANS...')

    // Get current payment plans via API
    const paymentPlansResponse = await fetch('http://localhost:3000/api/payment-plans', {
      headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
    })
    const allPaymentPlans = await paymentPlansResponse.json()
    
    console.log(`📊 Found ${allPaymentPlans.length} payment plans`)

    // IDENTIFY REAL vs TEST payment plans
    const realParents = ['j97de6dyw5c8m50je4a31z248x7n2mwp', 'j974fjk5p65bp0ewbteyn6jbhs7n48g1'] // Your real parent IDs
    const realParentIds = new Set(realParents)

    const testPaymentPlans = allPaymentPlans.filter((plan: any) => {
      const hasTestDescription = plan.description?.toLowerCase().includes('test') ||
        plan.description?.toLowerCase().includes('debug') ||
        plan.description?.toLowerCase().includes('api') ||
        plan.description?.toLowerCase().includes('browser') ||
        plan.description?.toLowerCase().includes('final') ||
        plan.description?.toLowerCase().includes('demo') ||
        plan.description?.toLowerCase().includes('verification') ||
        plan.description?.toLowerCase().includes('tracking') ||
        plan.description?.toLowerCase().includes('typescript') ||
        plan.description?.toLowerCase().includes('convex') ||
        plan.description?.toLowerCase().includes('first payment') ||
        !plan.description || 
        plan.description === ''
      
      // Also delete plans for non-real parents
      const parentNotReal = !realParentIds.has(plan.parentId)
      
      return hasTestDescription || parentNotReal
    })

    const realPaymentPlans = allPaymentPlans.filter((plan: any) => !testPaymentPlans.includes(plan))

    console.log(`✅ REAL PAYMENT PLANS TO KEEP: ${realPaymentPlans.length}`)
    realPaymentPlans.forEach((p: any) => console.log(`   - ${p.description || 'No description'} (Parent: ${p.parentId})`))
    
    console.log(`❌ TEST PAYMENT PLANS TO DELETE: ${testPaymentPlans.length}`)
    testPaymentPlans.forEach((p: any) => console.log(`   - ${p.description || 'No description'} (Parent: ${p.parentId})`))

    let deletedCount = 0

    // DELETE TEST PAYMENT PLANS using direct Convex mutation
    for (const plan of testPaymentPlans) {
      try {
        await convexHttp.mutation(api.payments.deletePaymentPlan, {
          id: plan._id
        })
        deletedCount++
        console.log(`   ✅ Deleted payment plan: ${plan.description || 'No description'}`)
      } catch (error) {
        console.warn(`   ⚠️ Failed to delete payment plan ${plan._id}:`, error)
      }
    }

    console.log(`✅ PAYMENT PLAN CLEANUP COMPLETED! Deleted ${deletedCount} test payment plans`)

    return createSuccessResponse({
      message: 'Payment plan cleanup completed successfully',
      deleted: deletedCount,
      before: allPaymentPlans.length,
      after: allPaymentPlans.length - deletedCount,
      realPaymentPlansKept: realPaymentPlans.length
    })

  } catch (error) {
    console.error('💥 Payment plan cleanup error:', error)
    return createErrorResponse(
      'Failed to cleanup payment plans: ' + (error instanceof Error ? error.message : 'Unknown error'),
      500,
      ApiErrors.INTERNAL_ERROR
    )
  }
}