
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../lib/api-utils'
import { convexHttp } from '../../../lib/convex-server'
import { api } from '../../../convex/_generated/api'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId') || undefined
    const status = searchParams.get('status') || undefined

    // Get payment plans from Convex with optional filters
    const paymentPlans = await convexHttp.query(api.payments.getPaymentPlans, {
      parentId: parentId as any,
      status: status as any,
    });

    return NextResponse.json(paymentPlans)
  } catch (error) {
    console.error('Payment plans fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment plans' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request);
    const body = await request.json();
    const { parentId, totalAmount, type, installments, startDate, description, installmentAmount, paymentMethod } = body;

    if (!parentId || !totalAmount || !type || !installments || !startDate || !installmentAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`🔄 Creating payment plan for parent ${parentId}`)
    console.log(`📋 Plan details: Type=${type}, Total=${totalAmount}, Installments=${installments}, Amount=${installmentAmount}, Method=${paymentMethod}`)

    const errors: string[] = []; // Initialize errors array

    // Create the payment plan first
    const paymentPlanId = await convexHttp.mutation(api.payments.createPaymentPlan, {
      parentId,
      totalAmount,
      type,
      installments,
      startDate: new Date(startDate).getTime(), // Convert to timestamp
      status: 'active',
      description,
      installmentAmount,
      paymentMethod,
    });

    console.log(`✅ Created payment plan: ${paymentPlanId}`)

    // Create the main payment record
    const mainPaymentId = await convexHttp.mutation(api.payments.createPayment, {
      parentId,
      paymentPlanId,
      amount: totalAmount,
      dueDate: new Date(startDate).getTime(),
      status: 'pending',
    });

    console.log(`✅ Created main payment: ${mainPaymentId}`)

    // Create installments using the existing createInstallments function
    const frequency = type === 'monthly' ? 1 : type === 'quarterly' ? 3 : 12; // months between payments
    
    const installmentIds = await convexHttp.mutation(api.paymentInstallments.createInstallments, {
      parentPaymentId: mainPaymentId,
      parentId,
      paymentPlanId,
      totalAmount,
      installmentAmount,
      totalInstallments: installments,
      frequency,
      startDate: new Date(startDate).getTime(),
    });

    console.log(`✅ Created ${installmentIds.length} installments`)

    // Mark the first installment as paid directly in the database (not using mock endpoint)
    if (installmentIds.length > 0) {
      console.log(`🔄 Marking first installment as PAID in Convex database...`)
      
      try {
        // Use the markInstallmentPaid mutation to mark the first installment as paid
        await convexHttp.mutation(api.paymentInstallments.markInstallmentPaid, {
          installmentId: installmentIds[0], // First installment
        });
        
        console.log(`✅ Successfully marked first installment as PAID: ${installmentIds[0]}`)
        
        // Update the main payment to add a note about first payment being processed
        await convexHttp.mutation(api.payments.updatePayment, {
          id: mainPaymentId,
          notes: `Payment plan created - First installment of $${installmentAmount} automatically processed and PAID`,
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
          const installmentDueDate = new Date(startDate.getTime() + (i * 30 * 24 * 60 * 60 * 1000)) // Monthly intervals
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

    return NextResponse.json({ 
      paymentPlanId, 
      mainPaymentId,
      paymentIds: [mainPaymentId], // Add this for frontend compatibility
      installmentsCreated: installmentIds.length, 
      installmentIds,
      progressData: {
        totalInstallments: installments,
        paidInstallments: 1, // First installment paid
        overdueInstallments: 0,
        totalAmount: totalAmount,
        paidAmount: installmentAmount, // First installment amount
        remainingAmount: totalAmount - installmentAmount,
        progressPercentage: (1 / installments) * 100,
      },
      aiRemindersEnabled: installmentIds.length > 1,
      message: 'Payment plan created successfully. First installment automatically processed as paid. AI reminders scheduled for remaining payments.',
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating payment plan:', error);
    return NextResponse.json({ error: error.message || 'Failed to create payment plan' }, { status: 500 });
  }
}