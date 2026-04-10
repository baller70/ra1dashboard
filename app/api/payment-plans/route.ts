export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export async function GET(request: Request) {
  if (!convex) {
    return NextResponse.json({ error: 'Convex not configured' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId') || undefined;
    const status = searchParams.get('status') || undefined;
    const year = searchParams.get('year');

    const plans = await convex.query(api.payments.getPaymentPlans, {
      parentId,
      status,
      year: year ? parseInt(year) : undefined
    });

    const transformed = (plans || []).map((p: any) => ({
      _id: p._id,
      id: p._id,
      parentId: p.parentId,
      totalAmount: p.totalAmount,
      installmentAmount: p.installmentAmount,
      installments: p.installments,
      status: p.status,
      type: p.type,
      startDate: p.startDate,
      endDate: p.endDate,
      description: p.description,
      season: p.season,
      year: p.year,
      paymentMethod: p.paymentMethod,
      parent: p.parent || null,
      createdAt: p.createdAt || p._creationTime,
      updatedAt: p.updatedAt
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Payment plans fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment plans' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!convex) {
    return NextResponse.json({ error: 'Convex not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { parentId, totalAmount, type, installments, startDate, description, installmentAmount, paymentMethod, season, year } = body;

    const totalAmountNum = Number(totalAmount);
    const installmentAmountNum = Number(installmentAmount);
    const installmentsNum = Number(installments);
    const yearNum = year ? Number(year) : new Date(startDate).getFullYear();

    if (!parentId || !type || !startDate || !isFinite(totalAmountNum) || installmentsNum <= 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await convex.mutation(api.payments.createPaymentPlan, {
      parentId,
      totalAmount: totalAmountNum,
      installmentAmount: installmentAmountNum,
      installments: installmentsNum,
      type,
      startDate,
      description: description || `Payment plan - ${type}`,
      paymentMethod: paymentMethod || 'stripe_card',
      season: season || `${yearNum} Season`,
      year: yearNum
    });

    return NextResponse.json({
      success: true,
      paymentPlanId: result,
      message: `Payment plan created`
    });
  } catch (error: any) {
    console.error('Payment plan creation failed:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to create payment plan'
    }, { status: 500 });
  }
}
