import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function createParent() {
  try {
    const result = await convex.mutation(api.parents.createParent, {
      name: "Test Parent",
      email: "testparent@example.com",
      phone: "123-456-7890",
      status: "active",
    });
    
    console.log(result);

  } catch (error) {
    console.error("Error creating parent:", error);
  }
}

createParent();

