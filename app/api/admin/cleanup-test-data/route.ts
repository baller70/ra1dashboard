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

    console.log('🧹 STARTING TEST DATA CLEANUP...')

    // Get all parents to identify test data
    const parentsResponse = await convexHttp.query(api.parents.getParents, { 
      page: 1, 
      limit: 1000 
    })
    const allParents = parentsResponse.parents || []

    // Get all payments to identify test data
    const paymentsResponse = await convexHttp.query(api.payments.getPayments, { 
      page: 1, 
      limit: 1000 
    })
    const allPayments = paymentsResponse.payments || []

    console.log(`📊 Found ${allParents.length} parents and ${allPayments.length} payments`)

    // IDENTIFY REAL DATA (to preserve)
    const realParents = allParents.filter(parent => {
      const hasRealEmail = parent.email && 
        parent.email !== 'No email' && 
        parent.email !== 'test@example.com' &&
        parent.email.includes('@') &&
        !parent.email.includes('test')
      
      const hasRealName = parent.name && 
        parent.name !== 'Unknown Parent' &&
        parent.name !== 'Test Parent' &&
        !parent.name.toLowerCase().includes('test')

      return hasRealEmail && hasRealName
    })

    const realParentIds = new Set(realParents.map(p => p._id))

    // IDENTIFY TEST DATA (to delete)
    const testParents = allParents.filter(parent => !realParentIds.has(parent._id))
    const testPayments = allPayments.filter(payment => {
      // Delete payments with test parent names/emails
      const hasTestParentName = payment.parentName === 'Unknown Parent' || 
        payment.parentName === 'Test Parent' ||
        !payment.parentName ||
        payment.parentName.toLowerCase().includes('test')
      
      const hasTestEmail = payment.parentEmail === 'No email' ||
        payment.parentEmail === 'test@example.com' ||
        !payment.parentEmail ||
        payment.parentEmail.includes('test')

      // Also delete payments for deleted test parents
      const parentWasDeleted = !realParentIds.has(payment.parentId)

      return hasTestParentName || hasTestEmail || parentWasDeleted
    })

    console.log(`🎯 IDENTIFIED DATA:`)
    console.log(`✅ REAL PARENTS TO KEEP: ${realParents.length}`)
    realParents.forEach(p => console.log(`   - ${p.name} (${p.email})`))
    
    console.log(`❌ TEST PARENTS TO DELETE: ${testParents.length}`)
    testParents.forEach(p => console.log(`   - ${p.name} (${p.email})`))
    
    console.log(`❌ TEST PAYMENTS TO DELETE: ${testPayments.length}`)

    // Safety check - don't delete if we would delete more than 80% of data
    const deletePercentage = (testParents.length / allParents.length) * 100
    if (deletePercentage > 80) {
      console.error(`⚠️ SAFETY CHECK FAILED: Would delete ${deletePercentage.toFixed(1)}% of parents`)
      return createErrorResponse(
        `Safety check failed: Would delete ${deletePercentage.toFixed(1)}% of parents. Manual review required.`,
        400,
        ApiErrors.VALIDATION_ERROR
      )
    }

    let deletedCount = {
      parents: 0,
      payments: 0,
      paymentPlans: 0,
      templates: 0
    }

    // DELETE TEST PAYMENTS FIRST
    console.log('🗑️ Deleting test payments...')
    for (const payment of testPayments) {
      try {
        await convexHttp.mutation(api.payments.deletePayment, {
          id: payment._id
        })
        deletedCount.payments++
        console.log(`   ✅ Deleted payment: ${payment.parentName} - $${payment.amount}`)
      } catch (error) {
        console.warn(`   ⚠️ Failed to delete payment ${payment._id}:`, error)
      }
    }

    // DELETE TEST PARENTS
    console.log('🗑️ Deleting test parents...')
    for (const parent of testParents) {
      try {
        await convexHttp.mutation(api.parents.deleteParent, {
          id: parent._id
        })
        deletedCount.parents++
        console.log(`   ✅ Deleted parent: ${parent.name} (${parent.email})`)
      } catch (error) {
        console.warn(`   ⚠️ Failed to delete parent ${parent._id}:`, error)
      }
    }

    // DELETE TEST TEMPLATES (optional - only if they exist)
    try {
      const templatesResponse = await convexHttp.query(api.templates.getTemplates, { 
        page: 1, 
        limit: 1000 
      })
      const allTemplates = templatesResponse.templates || []
      
      const testTemplates = allTemplates.filter(template => 
        template.name?.toLowerCase().includes('test') ||
        template.subject?.toLowerCase().includes('test') ||
        !template.isActive
      )

      console.log(`🗑️ Deleting ${testTemplates.length} test templates...`)
      for (const template of testTemplates) {
        try {
          await convexHttp.mutation(api.templates.deleteTemplate, {
            id: template._id
          })
          deletedCount.templates++
          console.log(`   ✅ Deleted template: ${template.name}`)
        } catch (error) {
          console.warn(`   ⚠️ Failed to delete template ${template._id}:`, error)
        }
      }
    } catch (error) {
      console.log('⚠️ Templates cleanup skipped (table may not exist)')
    }

    // FINAL VERIFICATION
    const finalParentsResponse = await convexHttp.query(api.parents.getParents, { 
      page: 1, 
      limit: 1000 
    })
    const finalPaymentsResponse = await convexHttp.query(api.payments.getPayments, { 
      page: 1, 
      limit: 1000 
    })

    const finalParentsCount = finalParentsResponse.parents?.length || 0
    const finalPaymentsCount = finalPaymentsResponse.payments?.length || 0

    console.log('✅ CLEANUP COMPLETED!')
    console.log(`📊 FINAL COUNTS:`)
    console.log(`   Parents: ${allParents.length} → ${finalParentsCount} (deleted ${deletedCount.parents})`)
    console.log(`   Payments: ${allPayments.length} → ${finalPaymentsCount} (deleted ${deletedCount.payments})`)
    console.log(`   Templates: deleted ${deletedCount.templates}`)

    // Verify only real data remains
    const remainingParents = finalParentsResponse.parents || []
    console.log('✅ REMAINING PARENTS (should be real data only):')
    remainingParents.forEach(p => console.log(`   - ${p.name} (${p.email})`))

    return createSuccessResponse({
      message: 'Test data cleanup completed successfully',
      deleted: deletedCount,
      before: {
        parents: allParents.length,
        payments: allPayments.length
      },
      after: {
        parents: finalParentsCount,
        payments: finalPaymentsCount
      },
      remainingParents: remainingParents.map(p => ({ name: p.name, email: p.email }))
    })

  } catch (error) {
    console.error('💥 Test data cleanup error:', error)
    return createErrorResponse(
      'Failed to cleanup test data: ' + (error instanceof Error ? error.message : 'Unknown error'),
      500,
      ApiErrors.INTERNAL_ERROR
    )
  }
}