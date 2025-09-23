export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function getConvex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  return new ConvexHttpClient(url);
}

// Minimal Resend webhook to track delivery/bounce/open via message_log_id tag
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const type = payload?.type || payload?.event || "unknown";
    const data = payload?.data || payload?.record || payload || {};

    // Resend sends tags; we attach message_log_id / parent_id when sending
    const tagsArr: Array<{ name: string; value: string }> =
      data?.tags || payload?.tags || [];

    const findTag = (n: string) =>
      tagsArr.find((t) => (t?.name || "").toLowerCase() === n.toLowerCase());

    const messageLogTag = findTag("message_log_id");
    const parentIdTag = findTag("parent_id");
    const typeTag = findTag("type");

    const messageLogId = messageLogTag?.value;
    const parentId = parentIdTag?.value;
    const messageType = typeTag?.value || "league_fee_reminder";

    const convex = getConvex();

    // Map Resend events to our statuses
    const mapStatus = (t: string) => {
      const key = t.toLowerCase();
      if (key.includes("delivered")) return "delivered";
      if (key.includes("bounced") || key.includes("bounce")) return "bounced";
      if (key.includes("complaint")) return "complaint";
      if (key.includes("opened") || key.includes("open")) return "opened";
      if (key.includes("clicked") || key.includes("click")) return "clicked";
      return "event";
    };

    if (messageLogId) {
      try {
        const status = mapStatus(type);
        await convex.mutation(api.messageLogs.updateMessageStatus, {
          id: messageLogId as any,
          status,
          // only set deliveredAt on delivered event
          deliveredAt: status === "delivered" ? Date.now() : undefined,
        } as any);
      } catch (e) {
        console.warn("webhook: updateMessageStatus failed", e);
      }

      if (parentId) {
        try {
          await convex.mutation(api.messageLogs.createMessageAnalytics, {
            messageLogId: messageLogId as any,
            parentId: parentId as any,
            channel: "email",
            messageType,
          });
        } catch (e) {
          console.warn("webhook: createMessageAnalytics failed", e);
        }
      }
    }

    return NextResponse.json({ ok: true, type, messageLogId, parentId });
  } catch (error) {
    console.error("Resend webhook handler error:", error);
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

