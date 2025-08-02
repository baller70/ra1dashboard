import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../../lib/api-utils'
import { convexHttp } from '../../../../../lib/convex-server'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    
    console.log(`🔄 Marking first installment as paid for payment: ${params.id}`)
    
    // Get all installments for this payment
    const allInstallments = await convexHttp.query(api.paymentInstallments.getPaymentInstallments, {
      parentPaymentId: params.id as Id<"payments">,
    });
    
    console.log(`📊 Found ${allInstallments.length} installments`)
    
    // Find the first installment (installmentNumber = 1)
    const firstInstallment = allInstallments.find(inst => inst.installmentNumber === 1);
    
    if (firstInstallment) {
      console.log(`🎯 Found first installment: ${firstInstallment._id}, current status: ${firstInstallment.status}`)
      
      // Use the existing updateInstallmentToPaid mutation
      await convexHttp.mutation(api.paymentInstallments.updateInstallmentToPaid, {
        installmentId: firstInstallment._id,
      });
      
      console.log(`✅ Successfully marked first installment as paid: ${firstInstallment._id}`)
      
      return NextResponse.json({ 
        success: true, 
        installmentId: firstInstallment._id,
        message: "First installment marked as paid successfully"
      });
    } else {
      console.log(`❌ No first installment found`)
      return NextResponse.json({ error: 'First installment not found' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('❌ Error marking first installment as paid:', error);
    return NextResponse.json({ error: error.message || 'Failed to mark first installment as paid' }, { status: 500 });
  }
} 