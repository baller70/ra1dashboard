export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { requireAuthWithApiKeyBypass } from "../../../../lib/api-utils";

// Backfill parents with missing/empty program to 'yearly-program'
export async function POST(request: NextRequest) {
  try {
    // Require API key or authenticated admin; supports x-api-key header
    await requireAuthWithApiKeyBypass(request);

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Pull a big page to cover all existing parents; this is idempotent and safe
    const result = await convex.query(api.parents.getParents, {
      page: 1,
      limit: 5000,
    });

    const parents: any[] = result.parents || [];

    const toBackfill = parents.filter((p: any) => {
      const prog = (p as any).program;
      return prog === undefined || prog === null || String(prog).trim() === "";
    });

    let success = 0;
    const failures: { id: string; error: string }[] = [];

    for (const p of toBackfill) {
      try {
        await convex.mutation(api.parents.updateParent, {
          id: p._id,
          program: "yearly-program",
        });
        success += 1;
      } catch (e: any) {
        failures.push({ id: String(p._id), error: e?.message || String(e) });
      }
    }

    return NextResponse.json({
      success: true,
      totalExamined: parents.length,
      toBackfill: toBackfill.length,
      updated: success,
      failed: failures.length,
      failures,
    });
  } catch (error: any) {
    console.error("Backfill yearly parents failed:", error);
    return new NextResponse(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

