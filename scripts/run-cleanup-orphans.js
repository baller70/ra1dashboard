/*
  Trigger Convex orphan cleanup from the command line.
  Usage: node scripts/run-cleanup-orphans.js
*/

const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api.js");

async function run() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL_FALLBACK || "https://blessed-scorpion-846.convex.cloud";
  if (!url) {
    console.error("Convex URL not configured.");
    process.exit(1);
  }
  console.log("Using Convex URL:", url);
  const client = new ConvexHttpClient(url);
  try {
    const result = await client.mutation(api.dataCleanup.cleanupOrphanedRecords, {
      confirmCleanup: true,
      dryRun: false,
    });
    console.log("Cleanup result:", JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Cleanup failed:", err?.message || err);
    process.exit(2);
  }
}

run();


