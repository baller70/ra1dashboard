export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(secret, { apiVersion: "2024-06-20" } as any);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook secret/signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  const stripe = getStripe();

  try {
    const buf = await req.arrayBuffer();
    const payload = Buffer.from(buf);
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "payment_intent.succeeded"
    ) {
      const data = event.data.object as any;
      const metadata = data?.metadata || {};
      const source = metadata?.source;
      const parentId = metadata?.parentId;
      const paymentId = metadata?.paymentId;
      const installmentIds = (metadata?.installmentIds || "")
        .split(",")
        .filter((x: string) => !!x);

      // Only process combined reminder payments
      if (source === "combined_reminder" && parentId && installmentIds.length > 0) {
        try {
          // Mark installments paid
          await convex.mutation(api.paymentInstallments.markInstallmentsPaid as any, {
            installmentIds,
            paidAt: Date.now(),
          } as any);
        } catch (e) {
          console.warn("Unable to mark installments paid:", e);
        }

        // Deactivate recurring reminders that include these installments
        try {
          await convex.mutation(api.recurringReminders.updateSchedulesForPaid as any, {
            installmentIds,
          } as any);
        } catch (e) {
          console.warn("Unable to deactivate schedules:", e);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handling error:", err);
    return NextResponse.json({ error: err?.message || "Webhook error" }, { status: 500 });
  }
}


