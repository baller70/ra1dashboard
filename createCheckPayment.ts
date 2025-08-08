import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function createCheckPayment() {
  try {
    const parentId = "j57dzvzdfv436rc7zgptcr62j57n882k";

    // 2. Define the check payment data
    const paymentData = {
      parentId: parentId,
      startDate: new Date().toISOString().split("T")[0],
      paymentMethod: "check",
      type: "custom",
      totalAmount: 200,
      installmentAmount: 100,
      installments: 2,
      description: "Test check payment plan",
      checkNumbers: ["123", "456"],
      frequency: 1,
    };

    // 3. Create the payment plan
    const result = await convex.mutation(api.payment_plans.createPaymentPlan, paymentData);
    
    console.log("Created check payment plan:", result);

    if (result.mainPaymentId) {
      const url = `http://localhost:3002/payments/${result.mainPaymentId}`;
      console.log(`Accessing payment details page at ${url}`);
      try {
        const response = await fetch(url);
        if (response.ok) {
          console.log("Successfully accessed payment details page.");
        } else {
          console.error(`Failed to access payment details page. Status: ${response.status}`);
        }
      } catch (error) {
        console.error("Error accessing payment details page:", error);
      }
    }

  } catch (error) {
    console.error("Error creating check payment plan:", error);
  }
}

createCheckPayment();

