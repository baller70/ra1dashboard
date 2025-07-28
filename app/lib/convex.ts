import { ConvexReactClient } from "convex/react";
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

// Create clients with error handling
let convex: ConvexReactClient;
let convexHttp: ConvexHttpClient;

try {
  convex = new ConvexReactClient(convexUrl);
  convexHttp = new ConvexHttpClient(convexUrl);
} catch (error) {
  console.error('Failed to initialize Convex clients:', error);
  // Create dummy clients to prevent crashes
  convex = new ConvexReactClient('https://dummy-convex-url.convex.cloud');
  convexHttp = new ConvexHttpClient('https://dummy-convex-url.convex.cloud');
}

export { convex, convexHttp }; 