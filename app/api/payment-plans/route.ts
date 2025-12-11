
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../lib/api-utils'
import prisma from '../../../lib/prisma'

export async function GET(request: Request) {
  try {
    // Soft-auth: allow read-only access even if unauthenticated
    try { await requireAuthWithApiKeyBypass(request) } catch (_) {
      console.log('ℹ️ payment-plans GET: auth bypassed for read-only')
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId') || undefined
    const status = searchParams.get('status') || undefined
    const program = (searchParams.get('program') || '').trim()

    // Build where clause for Prisma
    const where: any = {}
    if (parentId) where.parentId = parentId
    if (status) where.status = status
    if (program) {
      // filter by parent program
      where.parents = { program }
    }

    const plans = await prisma.payment_plans.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        parents: {
          select: {
            id: true,
            name: true,
            email: true,
            program: true,
            teamId: true,
          }
        }
      }
    })

    const transformed = plans.map((p) => ({
      _id: p.id,
      id: p.id,
      parentId: p.parentId,
      totalAmount: p.totalAmount,
      installmentAmount: p.installmentAmount,
      installments: p.installments,
      status: p.status,
      type: p.type,
      startDate: p.startDate?.toISOString(),
      endDate: p.endDate?.toISOString(),
      description: p.description,
      season: p.season,
      year: p.year,
      paymentMethod: p.paymentMethod,
      parent: p.parents ? {
        _id: p.parents.id,
        id: p.parents.id,
        name: p.parents.name,
        email: p.parents.email,
        program: p.parents.program,
        teamId: p.parents.teamId,
      } : null,
    }))

    return NextResponse.json(transformed)
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
    const { parentId, totalAmount, type, installments, startDate, description, installmentAmount, paymentMethod, season, year } = body;

    // Coerce numeric fields defensively
    const totalAmountNum = Number(totalAmount)
    const installmentAmountNum = Number(installmentAmount)
    const installmentsNum = Number(installments)
    const yearNum = year ? Number(year) : new Date(startDate).getFullYear()

    stage = 'validate-input'
    if (!parentId || !type || !startDate || !isFinite(totalAmountNum) || !isFinite(installmentAmountNum) || !isFinite(installmentsNum) || installmentsNum <= 0) {
      return NextResponse.json({ error: 'Missing required fields', stage }, { status: 400 });
    }

    console.log(`🔄 Creating payment plan for parent ${parentId}`)
    console.log(`📋 Plan details: Type=${type}, Total=${totalAmount}, Installments=${installments}, Amount=${installmentAmount}, Method=${paymentMethod}`)

    // Verify parent exists in Prisma
    stage = 'verify-parent'
    const parent = await prisma.parents.findUnique({
      where: { id: parentId }
    })
    
    if (!parent) {
      return NextResponse.json({ error: `Parent not found: ${parentId}`, stage }, { status: 400 })
    }

    // Normalize start date
    stage = 'normalize-date'
    const startDateObj = new Date(startDate)

    // Create the payment plan in PostgreSQL
    stage = 'create-payment-plan'
    const paymentPlan = await prisma.payment_plans.create({
      data: {
        id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        parentId: parentId,
        totalAmount: totalAmountNum,
        installmentAmount: installmentAmountNum,
        installments: installmentsNum,
        type: type,
        status: 'active',
        startDate: startDateObj,
        description: description || `Payment plan - ${type}`,
        paymentMethod: paymentMethod || 'stripe_card',
        season: season || `${yearNum} Season`,
        year: yearNum,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })
    console.log(`✅ Created payment plan: ${paymentPlan.id}`)

    // Create the main payment record
    stage = 'create-main-payment'
    const mainPayment = await prisma.payments.create({
      data: {
        id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        parentId: parentId,
        paymentPlanId: paymentPlan.id,
        amount: totalAmountNum,
        dueDate: startDateObj,
        status: 'pending',
        paymentMethod: paymentMethod || 'stripe_card',
        season: season || `${yearNum} Season`,
        year: yearNum,
        notes: `Payment plan created - ${installmentsNum} installments of $${installmentAmountNum.toFixed(2)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })
    console.log(`✅ Created main payment: ${mainPayment.id}`)

    // Create installments
    stage = 'create-installments'
    const frequency = type === 'monthly' ? 1 : type === 'quarterly' ? 3 : 1 // months between payments
    const installmentIds: string[] = []

    for (let i = 0; i < installmentsNum; i++) {
      const installmentDueDate = new Date(startDateObj)
      installmentDueDate.setMonth(installmentDueDate.getMonth() + (i * frequency))

      const installment = await prisma.payment_installments.create({
        data: {
          id: `inst_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          parentPaymentId: mainPayment.id,
          parentId: parentId,
          paymentPlanId: paymentPlan.id,
          installmentNumber: i + 1,
          totalInstallments: installmentsNum,
          amount: installmentAmountNum,
          dueDate: installmentDueDate,
          status: i === 0 ? 'paid' : 'pending', // First installment marked as paid
          paidAt: i === 0 ? new Date() : null,
          notes: `Installment ${i + 1} of ${installmentsNum}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      })
      installmentIds.push(installment.id)
    }
    console.log(`✅ Created ${installmentIds.length} installments`)

    // Update main payment with first installment paid note
    if (installmentIds.length > 0) {
      await prisma.payments.update({
        where: { id: mainPayment.id },
        data: {
          notes: `Payment plan created - First installment of $${installmentAmountNum.toFixed(2)} automatically processed and PAID`,
          status: installmentsNum === 1 ? 'paid' : 'pending',
          paidAt: installmentsNum === 1 ? new Date() : null,
        }
      })
    }

    return NextResponse.json({
      success: true,
      paymentPlanId: paymentPlan.id,
      mainPaymentId: mainPayment.id,
      paymentIds: [mainPayment.id],
      installmentIds: installmentIds,
      message: `Payment plan created with ${installmentIds.length} installments`
    })

  } catch (error: any) {
    console.error(`❌ Payment plan creation failed at stage "${stage}":`, error)
    return NextResponse.json({
      error: error?.message || 'Failed to create payment plan',
      stage,
      details: String(error?.stack || error)
    }, { status: 500 })
  }
}
