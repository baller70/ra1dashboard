import { ConvexReactClient } from "convex/react";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const convexHttp = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export { convex, convexHttp }; 