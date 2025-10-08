export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { requireAuthWithApiKeyBypass } from "../../../../lib/api-utils";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const schema = z.object({
  teamId: z.string().min(1, "teamId required"),
  program: z.string().default("yearly-program"),
  windowMinutes: z.number().int().positive().max(60).default(10),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuthWithApiKeyBypass(request);
    const body = await request.json().catch(() => ({}));
    const { teamId, program, windowMinutes } = schema.parse(body);

    const now = Date.now();
    const since = now - windowMinutes * 60 * 1000;

    // Pull parents (same source used across app) and filter by criteria
    const res = await convex.query(api.parents.getParents, { page: 1, limit: 5000 });
    const parents: any[] = Array.isArray((res as any)?.parents) ? (res as any).parents : [];

    const candidates = parents.filter((p: any) => {
      const prog = String((p as any).program || "").trim();
      const tid = (p as any).teamId;
      const updatedAt = Number((p as any).updatedAt || 0);
      return prog === program && !tid && updatedAt >= since;
    });

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, assigned: 0, message: "No recently unassigned Yearly parents found in window" });
    }

    // Assign in one call
    const result = await convex.mutation(api.teams.assignParentsToTeam, {
      teamId: teamId as any,
      parentIds: candidates.map((p: any) => p._id) as any[],
    });

    return NextResponse.json({
      success: true,
      requestedWindowMinutes: windowMinutes,
      program,
      teamId,
      matched: candidates.length,
      assigned: result?.assignedCount ?? 0,
      parents: result?.parents?.map((p: any) => ({ _id: p._id, name: p.name, email: p.email })) ?? [],
    });
  } catch (error: any) {
    const msg = error?.message || String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

