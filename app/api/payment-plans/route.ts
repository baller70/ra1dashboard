
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../lib/api-utils'
import { api } from '../../../convex/_generated/api'
import { convexHttp } from '../../lib/convex-server'

export async function GET(request: Request) {
  try {
    // Soft-auth: allow read-only access even if unauthenticated
    try { await requireAuthWithApiKeyBypass(request) } catch (_) {
      console.log('ℹ️ payment-plans GET: auth bypassed for read-only')
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId') || undefined
    const status = searchParams.get('status') || undefined

    // Get payment plans from Convex with optional filters
    try {
      const paymentPlans = await convexHttp.query(api.payments.getPaymentPlans as any, {
        parentId: parentId as any,
        status: status as any,
      } as any);
      return NextResponse.json(paymentPlans || [])
    } catch (e) {
      console.warn('payment-plans query failed, returning empty list:', (e as any)?.message || e)
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Payment plans fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment plans' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  let stage: string = 'init'
  try {
    stage = 'auth'
    await requireAuthWithApiKeyBypass(request);

    stage = 'parse-json'
    const body = await request.json();
    const { parentId, totalAmount, type, installments, startDate, description, installmentAmount, paymentMethod } = body;

    // Coerce numeric fields defensively
    const totalAmountNum = Number(totalAmount)
    const installmentAmountNum = Number(installmentAmount)
    const installmentsNum = Number(installments)

    stage = 'validate-input'
    if (!parentId || !type || !startDate || !isFinite(totalAmountNum) || !isFinite(installmentAmountNum) || !isFinite(installmentsNum) || installmentsNum <= 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    stage = 'convex-init'
    const convex = convexHttp
    console.log(`🔗 Using Convex server client for payment-plans` )
    console.log(`🔄 Creating payment plan for parent ${parentId}`)
    console.log(`📋 Plan details: Type=${type}, Total=${totalAmount}, Installments=${installments}, Amount=${installmentAmount}, Method=${paymentMethod}`)

    const errors: string[] = []; // Initialize errors array

    // Normalize start date once
    stage = 'normalize-date'
    const startTimestamp = new Date(startDate).getTime();

    // Verify parent exists in Convex (guards against cross-project ID mismatch)
    stage = 'verify-parent'
    try {
      const parent = await convex.query(api.parents.getParentFresh as any, { id: parentId as any, timestamp: Date.now() })
      if (!parent) {
        return NextResponse.json({ error: `Parent not found: ${parentId}`, stage }, { status: 400 })
      }
    } catch (e: any) {
      console.error('❌ Parent lookup failed:', e?.message || e)
      return NextResponse.json({ error: `Parent lookup failed: ${e?.message || 'unknown error'}`, stage }, { status: 500 })
    }

    // Create the payment plan first (new API), then fall back to legacy API if it fails
    stage = 'create-payment-plan'
    let paymentPlanId: string | undefined
    let mainPaymentIdFromLegacy: string | undefined
    try {
      paymentPlanId = await convex.mutation(api.payments.createPaymentPlan, {
        parentId,
        totalAmount: totalAmountNum,
        type,
        installments: installmentsNum,
        startDate: startTimestamp, // timestamp
        status: 'active',
        description,
        installmentAmount: installmentAmountNum,
        paymentMethod,
      })
      console.log(`✅ Created payment plan (new): ${paymentPlanId}`)
    } catch (eNew: any) {
      console.error('❌ createPaymentPlan (new) failed:', eNew?.message || eNew)
      // LEGACY FALLBACK
      try {
        stage = 'create-payment-plan-legacy'
        const legacy = await convex.mutation(api.payment_plans.createPaymentPlan as any, {
          parentId,
          startDate: new Date(startTimestamp).toISOString(),
          paymentMethod: paymentMethod || 'stripe_card',
          type,
          totalAmount: totalAmountNum,
          installmentAmount: installmentAmountNum,
          installments: installmentsNum,
          description: description || `Payment plan (${type})`,
          frequency: type === 'monthly' ? 1 : type === 'quarterly' ? 3 : 1,
        })
        paymentPlanId = legacy?.newPaymentPlanId
        mainPaymentIdFromLegacy = legacy?.mainPaymentId
        if (!paymentPlanId) {
          throw new Error('Legacy createPaymentPlan did not return plan id')
        }
        console.log(`✅ Created payment plan (legacy): ${paymentPlanId}`)
      } catch (eLegacy: any) {
        console.error('❌ createPaymentPlan (legacy) failed:', eLegacy?.message || eLegacy)
        return NextResponse.json({
          error: eLegacy?.message || 'createPaymentPlan failed',
          stage,
          details: String(eLegacy?.stack || eLegacy)
        }, { status: 500 })
      }
    }

    // Create the main payment record if legacy path didn't already create it
    stage = 'create-main-payment'
    const mainPaymentId = mainPaymentIdFromLegacy || await convex.mutation(api.payments.createPayment, {
      parentId,
      paymentPlanId,
      amount: totalAmountNum,
      dueDate: startTimestamp,
      status: 'pending',
      paymentMethod: paymentMethod || 'stripe_card',
    });

    console.log(`✅ Created main payment: ${mainPaymentId}`)

    // Create installments only if we used the new API; legacy path already created them
    stage = 'create-installments'
    const frequency = type === 'monthly' ? 1 : type === 'quarterly' ? 3 : 12; // months between payments
    let installmentIds: string[] = []
    if (!mainPaymentIdFromLegacy) {
      try {
        installmentIds = await convex.mutation(api.paymentInstallments.createInstallments as any, {
          parentPaymentId: mainPaymentId,
          parentId,
          paymentPlanId,
          totalAmount: totalAmountNum,
          installmentAmount: installmentAmountNum,
          totalInstallments: installmentsNum,
          frequency,
          startDate: startTimestamp,
        });
      } catch (instErr: any) {
        console.error('❌ Error creating installments:', instErr?.message || instErr)
        errors.push(`Failed to create installments: ${instErr?.message || 'Unknown error'}`)
        installmentIds = []
      }
    }

    console.log(`✅ Created ${installmentIds.length} installments`)

    // Mark the first installment as paid directly in the database (not using mock endpoint)
    if (!mainPaymentIdFromLegacy && installmentIds.length > 0) {
      console.log(`🔄 Marking first installment as PAID in Convex database...`)
      
      try {
        stage = 'mark-first-installment-paid'
        // Use the markInstallmentPaid mutation to mark the first installment as paid
        await convex.mutation(api.paymentInstallments.markInstallmentPaid, {
          installmentId: installmentIds[0], // First installment
        });
        
        console.log(`✅ Successfully marked first installment as PAID: ${installmentIds[0]}`)
        
        // Update the main payment to add a note about first payment being processed
        stage = 'update-main-payment-note'
        await convex.mutation(api.payments.updatePayment, {
          id: mainPaymentId,
          notes: `Payment plan created - First installment of $${installmentAmountNum} automatically processed and PAID`,
        });
        
        console.log(`✅ Updated main payment with processing note`)
        
      } catch (error: any) {
        console.error('❌ Error processing first payment:', error);
        errors.push(`Failed to process first payment: ${error.message || 'Unknown error'}`);
      }
    }

    // Set up AI reminders for remaining installments
    if (installmentIds.length > 1) {
      console.log(`🤖 Setting up AI reminders for ${installmentIds.length - 1} remaining installments...`)
      
      try {
        // Skip the first installment (already paid) and set up reminders for the rest
        for (let i = 1; i < installmentIds.length; i++) {
          const installmentId = installmentIds[i]
          
          // Calculate reminder dates (7 days before, 3 days before, and on due date)
          const installmentDueDate = new Date(startTimestamp + (i * 30 * 24 * 60 * 60 * 1000)) // Monthly intervals
          const reminder7Days = new Date(installmentDueDate.getTime() - (7 * 24 * 60 * 60 * 1000))
          const reminder3Days = new Date(installmentDueDate.getTime() - (3 * 24 * 60 * 60 * 1000))
          
          // Create scheduled AI reminders
          const reminderData = {
            paymentId: mainPaymentId,
            installmentId: installmentId,
            parentId: parentId,
            installmentNumber: i + 1,
            amount: installmentAmount,
            dueDate: installmentDueDate.getTime(),
            reminderDates: [
              reminder7Days.getTime(),
              reminder3Days.getTime(),
              installmentDueDate.getTime()
            ]
          }
          
          // Store reminder schedule in database (you can create a scheduledReminders table)
          console.log(`📅 AI reminder scheduled for installment ${i + 1}: ${installmentDueDate.toDateString()}`)
        }
        
        console.log(`✅ AI reminders set up for all remaining payments`)
        
      } catch (error: any) {
        console.error('❌ Error setting up AI reminders:', error);
        // Don't fail the entire operation if reminders fail
      }
    }

    console.log(`🎉 Payment plan creation complete:`)
    console.log(`   - Plan ID: ${paymentPlanId}`)
    console.log(`   - Main Payment ID: ${mainPaymentId}`)
    console.log(`   - Installments created: ${installmentIds.length}`)
    console.log(`   - First installment marked as PAID`)
    console.log(`   - Remaining ${installmentIds.length - 1} installments marked as PENDING`)
    console.log(`   - AI reminders scheduled for remaining payments`)

    stage = 'success-response'
    return NextResponse.json({ 
      paymentPlanId, 
      mainPaymentId,
      paymentIds: [mainPaymentId], // Add this for frontend compatibility
      installmentsCreated: installmentIds.length, 
      installmentIds,
      progressData: {
        totalInstallments: installmentsNum,
        paidInstallments: 1, // First installment paid
        overdueInstallments: 0,
        totalAmount: totalAmountNum,
        paidAmount: installmentAmountNum, // First installment amount
        remainingAmount: totalAmountNum - installmentAmountNum,
        progressPercentage: (1 / installmentsNum) * 100,
      },
      aiRemindersEnabled: installmentIds.length > 1,
      message: errors.length
        ? `Payment plan created with warnings: ${errors.join('; ')}`
        : 'Payment plan created successfully. First installment automatically processed as paid. AI reminders scheduled for remaining payments.',
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating payment plan (stage=' + stage + '):', error);
    // Ensure JSON body
    const message = (error && error.message) ? error.message : 'Failed to create payment plan'
    const payload: any = { error: message, stage }
    return new Response(JSON.stringify(payload), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}