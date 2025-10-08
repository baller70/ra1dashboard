export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { requireAuthWithApiKeyBypass } from "../../../../../lib/api-utils";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const schema = z.object({
  teamId: z.string().min(1),
  program: z.string().default("yearly-program"),
  strategy: z.enum(["payments", "payments_or_plans"]).default("payments"),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuthWithApiKeyBypass(request);
    const body = await request.json().catch(() => ({}));
    const { teamId, program, strategy } = schema.parse(body);

    // 1) All parents in the specified program currently assigned to this team
    const parentsRes = await convex.query(api.parents.getParents, { page: 1, limit: 5000 });
    const allParents: any[] = Array.isArray(parentsRes?.parents) ? parentsRes.parents : [];
    const inTeam = allParents.filter(p => String(p.program || '').trim() === program && String(p.teamId || '') === String(teamId));
    const inTeamIds = new Set(inTeam.map(p => String(p._id)));

    // 2) Gather keepers based on strategy
    const keepers = new Set<string>();

    // Payments present?
    const paymentsRes = await convex.query(api.payments.getPayments, { page: 1, limit: 5000 });
    const payments: any[] = Array.isArray((paymentsRes as any)?.payments) ? (paymentsRes as any).payments : [];
    for (const pay of payments) {
      const parent = (pay as any).parent;
      if (!parent) continue;
      const pid = String((pay as any).parentId || (parent as any)._id || '');
      const parentProgram = String((parent as any).program || '').trim();
      const parentTeam = String((parent as any).teamId || '');
      if (inTeamIds.has(pid) && parentProgram === program && parentTeam === String(teamId)) {
        keepers.add(pid);
      }
    }

    if (strategy === 'payments_or_plans') {
      // Parents with a payment plan also count as keepers
      const plans = await convex.query(api.payments.getPaymentPlans, {} as any);
      for (const plan of plans as any[]) {
        const par = (plan as any).parent;
        const pid = String((plan as any).parentId || (par as any)?._id || '');
        const parentProgram = String((par as any)?.program || '').trim();
        const parentTeam = String((par as any)?.teamId || '');
        if (inTeamIds.has(pid) && parentProgram === program && parentTeam === String(teamId)) {
          keepers.add(pid);
        }
      }
    }

    // Exclude archived
    const finalKeepers = new Set(
      [...keepers].filter(pid => {
        const parent = inTeam.find(p => String(p._id) === pid);
        const status = String((parent as any)?.status || 'active').toLowerCase();
        return status !== 'archived';
      })
    );

    // If no keepers detected, do nothing to avoid accidental mass unassign
    if (finalKeepers.size === 0) {
      return NextResponse.json({ success: false, error: 'No visible parents detected; aborting to avoid removing all.' }, { status: 400 });
    }

    const toUnassign = inTeam.filter(p => !finalKeepers.has(String(p._id))).map(p => p._id);

    if (toUnassign.length > 0) {
      await convex.mutation(api.teams.unassignParentsFromTeams, { parentIds: toUnassign as any[] });
    }

    return NextResponse.json({
      success: true,
      teamId,
      program,
      beforeCount: inTeam.length,
      kept: [...finalKeepers],
      unassignedCount: toUnassign.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}

