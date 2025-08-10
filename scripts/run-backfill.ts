import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function runBackfill() {
  console.log("Starting payment method backfill...");
  try {
    const result = await convex.mutation(api.migrations.backfillPaymentMethods, {});
    console.log("Backfill complete!", result);
  } catch (error) {
    console.error("Backfill failed:", error);
  }
}

runBackfill();



