export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function findOrCreateSeason(convex: any, name: string, type: string, year: number) {
  // Try to find by type/year
  const seasons = await convex.query(api.seasons.getSeasonsByTypeAndYear as any, { type, year });
  if (seasons && seasons.length > 0) return seasons[0];
  const now = Date.now();
  const startDate = now;
  const endDate = now + 90 * 24 * 60 * 60 * 1000;
  const seasonId = await convex.mutation(api.seasons.createSeason as any, {
    name,
    type,
    year,
    startDate,
    endDate,
    registrationDeadline: endDate,
  });
  const created = await convex.query(api.seasons.getSeason as any, { id: seasonId });
  return created;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parentId, paymentMethod, seasonId, seasonName, seasonType, seasonYear, dueDate, notes, amount } = body || {};

    if (!parentId || !paymentMethod || !(seasonId || (seasonName && seasonType && seasonYear))) {
      return NextResponse.json({ error: 'Missing required fields: parentId, paymentMethod, and seasonId or seasonName/seasonType/seasonYear' }, { status: 400 });
    }

    let finalSeasonId = seasonId;
    if (!finalSeasonId) {
      const season = await findOrCreateSeason(convex, seasonName, seasonType, Number(seasonYear));
      finalSeasonId = season._id;
    }

    const result = await convex.mutation(api.tournamentFees.createTournamentFee as any, {
      seasonId: finalSeasonId,
      parentId,
      paymentMethod,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      notes,
      amount,
    });

    return NextResponse.json({ success: true, data: { tournamentFeeId: result } });
  } catch (error: any) {
    console.error('Create tournament fee error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create tournament fee' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const seasonId = searchParams.get('seasonId');

    if (!parentId && !seasonId) {
      return NextResponse.json({ error: 'Provide parentId or seasonId' }, { status: 400 });
    }

    if (parentId) {
      const fees = await convex.query(api.tournamentFees.getTournamentFeesByParent as any, { parentId: parentId as any });
      return NextResponse.json({ success: true, data: fees });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error: any) {
    console.error('Get tournament fees error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch tournament fees' }, { status: 500 });
  }
}

