import { ConvexHttpClient } from "convex/browser";

// Resolve Convex URL from env with safe production fallback
const getConvexUrl = (): string => {
  const fromEnv =
    process.env.NEXT_PUBLIC_CONVEX_URL ||
    process.env.CONVEX_URL ||
    process.env.NEXT_PUBLIC_CONVEX_URL_FALLBACK;

  if (fromEnv) return fromEnv;

  // Final fallback to deployed Convex instance (ensure env is set in Vercel)
  return "https://blessed-scorpion-846.convex.cloud";
};

const convexUrl = getConvexUrl();

// Create client with error handling
let convexHttp: ConvexHttpClient;

try {
  convexHttp = new ConvexHttpClient(convexUrl);
} catch (error) {
  console.error("Failed to initialize Convex HTTP client:", error);
  convexHttp = new ConvexHttpClient("https://blessed-scorpion-846.convex.cloud");
}

export { convexHttp };

// Database abstraction layer - now using only Convex
export const db = {
  // Helper to get the Convex client
  getConvexClient: () => convexHttp,
};
