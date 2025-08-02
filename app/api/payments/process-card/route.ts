import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('=== MOCK PAYMENT PROCESSING ===')
    console.log('Received payment request body:', body)
    
    const {
      paymentId,
      amount,
      totalAmount,
      paymentMethod,
      schedule,
      installments,
      customInstallments,
      customMonths,
      creditCardDetails,
      parentId
    } = body

    // Validate required fields
    if (!paymentId || !amount || !creditCardDetails) {
      console.error('Missing required fields:', { paymentId, amount, creditCardDetails: !!creditCardDetails })
      return NextResponse.json(
        { error: 'Missing required fields', details: { paymentId: !!paymentId, amount: !!amount, creditCardDetails: !!creditCardDetails } },
        { status: 400 }
      )
    }

    console.log('Processing mock credit card payment:', {
      paymentId,
      amount: amount / 100,
      schedule,
      installments,
      cardLast4: creditCardDetails.cardNumber.slice(-4)
    })

    // MOCK PAYMENT PROCESSING - Simulate successful payment
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay

    // Create mock installment schedule
    const installmentSchedule = []
    const installmentAmount = amount // Use the actual payment amount per installment
    const currentDate = new Date()

    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(currentDate)
      
      // Calculate due dates based on schedule
      if (schedule === 'monthly') {
        dueDate.setMonth(currentDate.getMonth() + i)
      } else if (schedule === 'quarterly') {
        dueDate.setMonth(currentDate.getMonth() + (i * 3))
      } else if (schedule === 'custom') {
        const monthsPerInstallment = customMonths / customInstallments
        dueDate.setMonth(currentDate.getMonth() + (i * monthsPerInstallment))
      } else {
        // Full payment - due immediately
        dueDate.setDate(currentDate.getDate() + i)
      }

      installmentSchedule.push({
        _id: `inst_${paymentId}_${i + 1}`,
        installmentNumber: i + 1,
        amount: installmentAmount / 100, // Convert to dollars
        dueDate: dueDate.getTime(),
        status: i === 0 ? 'paid' : 'pending', // First installment is paid immediately
        paidAt: i === 0 ? Date.now() : undefined,
        remindersSent: 0,
        stripePaymentIntentId: i === 0 ? `pi_mock_${Date.now()}` : null,
        description: `Installment ${i + 1} of ${installments}`,
        createdAt: Date.now()
      })
    }

    // Store installments temporarily for immediate UI updates
    ;(global as any).tempInstallments = (global as any).tempInstallments || {}
    ;(global as any).tempInstallments[paymentId] = installmentSchedule

    const paymentResult = {
      success: true,
      transactionId: `pi_mock_${Date.now()}`,
      paymentId,
      amount: amount / 100,
      stripeCustomerId: `cus_mock_${Date.now()}`,
      stripePaymentMethodId: `pm_mock_${Date.now()}`,
      installmentSchedule,
      progressData: {
        totalInstallments: installments,
        paidInstallments: 1, // First installment paid
        overdueInstallments: 0,
        totalAmount: totalAmount / 100,
        paidAmount: installmentAmount / 100, // First installment amount
        remainingAmount: (totalAmount - installmentAmount) / 100,
        progressPercentage: (1 / installments) * 100,
        nextDue: installments > 1 ? {
          id: installmentSchedule[1]._id,
          amount: installmentAmount / 100,
          dueDate: installmentSchedule[1].dueDate,
          installmentNumber: 2
        } : null,
        installments: installmentSchedule
      }
    }

    console.log('Mock payment processed successfully:', {
      paymentIntentId: paymentResult.transactionId,
      customerId: paymentResult.stripeCustomerId,
      amount: installmentAmount / 100,
      status: 'succeeded'
    })

    return NextResponse.json(paymentResult)

  } catch (error) {
    console.error('Mock payment processing error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 