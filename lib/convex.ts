import { ConvexReactClient } from "convex/react";

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

// Create React client for client-side operations only
let convex: ConvexReactClient;

try {
  convex = new ConvexReactClient(convexUrl);
} catch (error) {
  console.error('Failed to initialize Convex React client:', error);
  // Create a dummy client to prevent crashes
  convex = new ConvexReactClient('https://dummy-convex-url.convex.cloud');
}

export { convex }; 