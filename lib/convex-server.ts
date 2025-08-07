import { ConvexHttpClient } from "convex/browser";

// Resolve Convex URL from env with safe production fallback (server-side)
const getConvexUrl = (): string => {
  const fromEnv =
    process.env.NEXT_PUBLIC_CONVEX_URL ||
    process.env.CONVEX_URL ||
    process.env.NEXT_PUBLIC_CONVEX_URL_FALLBACK;

  if (fromEnv) return fromEnv;
  return "https://blessed-scorpion-846.convex.cloud";
};

const convexUrl = getConvexUrl();

// Create HTTP client for server-side operations only
let convexHttp: ConvexHttpClient;

try {
  convexHttp = new ConvexHttpClient(convexUrl);
} catch (error) {
  console.error('Failed to initialize Convex HTTP client:', error);
  convexHttp = new ConvexHttpClient('https://blessed-scorpion-846.convex.cloud');
}

export { convexHttp };