export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const bulkDeleteSchema = z.object({
  teamIds: z.array(z.string().min(1)).min(1)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamIds } = bulkDeleteSchema.parse(body);

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const id of teamIds) {
      try {
        await convex.mutation(api.teams.deleteTeam, { teamId: id as any });
        results.push({ id, success: true });
      } catch (e: any) {
        console.error('Bulk delete error for team', id, e);
        results.push({ id, success: false, error: e?.message || 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({ success: true, successCount, failCount, results });
  } catch (error) {
    console.error('Bulk delete teams error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to bulk delete teams' }, { status: 500 });
  }
}

