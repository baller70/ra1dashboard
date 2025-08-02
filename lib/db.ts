import { ConvexHttpClient } from "convex/browser";

// Safely get the Convex URL with fallback
const getConvexUrl = () => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    console.warn('NEXT_PUBLIC_CONVEX_URL is not configured. Using fallback.');
    return 'https://dummy-convex-url.convex.cloud'; // Fallback URL
  }
  return url;
};

const convexUrl = getConvexUrl();

// Create client with error handling
let convexHttp: ConvexHttpClient;

try {
  convexHttp = new ConvexHttpClient(convexUrl);
} catch (error) {
  console.error('Failed to initialize Convex HTTP client:', error);
  // Create dummy client to prevent crashes
  convexHttp = new ConvexHttpClient('https://dummy-convex-url.convex.cloud');
}

export { convexHttp };

// Database abstraction layer - now using only Convex
export const db = {
  // Helper to get the Convex client
  getConvexClient: () => convexHttp,
};
