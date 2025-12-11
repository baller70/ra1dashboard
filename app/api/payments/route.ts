export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '../../../lib/prisma';

const createPaymentSchema = z.object({
  parentId: z.string(),
  paymentPlanId: z.string().optional(),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const parentId = searchParams.get('parentId');
    const program = searchParams.get('program');
    const season = searchParams.get('season');
    const year = searchParams.get('year');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }
    if (parentId) {
      where.parentId = parentId
    }
    if (program && program !== 'all') {
      // filter by parent program
      where.parents = { program }
    }
    if (season && season !== 'all') {
      // payments may store season directly or on payment plan; filter on payment season
      where.OR = [
        { season },
        { payment_plans: { season } },
      ]
    }
    if (year && year !== 'all') {
      const yearNum = parseInt(year)
      if (!isNaN(yearNum)) {
        where.OR = where.OR || []
        where.OR.push({ year: yearNum }, { payment_plans: { year: yearNum } })
      }
    }

    // Fetch payments from PostgreSQL
    const [payments, total] = await Promise.all([
      prisma.payments.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          parents: {
            include: {
              teams: true
            }
          },
          payment_plans: true
        }
      }),
      prisma.payments.count({ where })
    ])

    // Transform to match expected format
    const transformedPayments = payments.map(p => ({
      _id: p.id,
      id: p.id,
      parentId: p.parentId,
      paymentPlanId: p.paymentPlanId,
      amount: p.amount,
      dueDate: p.dueDate?.toISOString(),
      status: p.status,
      paidAt: p.paidAt?.toISOString(),
      notes: p.notes,
      description: p.description,
      paymentMethod: p.paymentMethod,
      season: p.season,
      year: p.year,
      createdAt: p.createdAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
      parent: p.parents ? {
        _id: p.parents.id,
        id: p.parents.id,
        name: p.parents.name,
        email: p.parents.email,
        phone: p.parents.phone,
        teamId: p.parents.teamId,
        team: p.parents.teams ? {
          _id: p.parents.teams.id,
          id: p.parents.teams.id,
          name: p.parents.teams.name,
          color: p.parents.teams.color
        } : null
      } : null,
      paymentPlan: p.payment_plans ? {
        _id: p.payment_plans.id,
        id: p.payment_plans.id,
        type: p.payment_plans.type,
        totalAmount: p.payment_plans.totalAmount,
        installments: p.payment_plans.installments,
        status: p.payment_plans.status,
        season: p.payment_plans.season,
        year: p.payment_plans.year
      } : null
    }))

    return NextResponse.json({
      success: true,
      data: {
        payments: transformedPayments,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);

    // Create payment in PostgreSQL
    const payment = await prisma.payments.create({
      data: {
        parentId: validatedData.parentId,
        paymentPlanId: validatedData.paymentPlanId || null,
        amount: validatedData.amount,
        dueDate: new Date(validatedData.dueDate),
        status: 'pending',
        paymentMethod: body.paymentMethod || null,
        notes: validatedData.notes || null
      }
    });

    return NextResponse.json({ success: true, data: { _id: payment.id } }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payment data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
