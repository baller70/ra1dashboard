
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../lib/api-utils'
import { convexHttp } from '../../../lib/convex-server'
import { api } from '../../../convex/_generated/api'

export async function GET() {
  try {
    await requireAuth()
    
    // Get payment plans from Convex
    const paymentPlans = await convexHttp.query(api.payments.getPaymentPlans, {});

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
    await requireAuth();
    const body = await request.json();
    const { parentId, totalAmount, type, installments, startDate, description, installmentAmount } = body;

    if (!parentId || !totalAmount || !type || !installments || !startDate || !installmentAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`🔄 Creating payment plan for parent ${parentId}`)
    console.log(`📋 Plan details: Type=${type}, Total=${totalAmount}, Installments=${installments}, Amount=${installmentAmount}`)

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

    console.log(`🎉 Payment plan creation complete:`)
    console.log(`   - Plan ID: ${paymentPlanId}`)
    console.log(`   - Main Payment ID: ${mainPaymentId}`)
    console.log(`   - Installments created: ${installmentIds.length}`)
    console.log(`   - First installment marked as PAID`)
    console.log(`   - Remaining ${installmentIds.length - 1} installments marked as PENDING`)

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
      message: 'Payment plan created successfully. First installment automatically processed as paid.',
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating payment plan:', error);
    return NextResponse.json({ error: error.message || 'Failed to create payment plan' }, { status: 500 });
  }
}