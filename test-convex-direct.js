const { ConvexHttpClient } = require("convex/browser");

// Use the correct Convex URL from your environment
const client = new ConvexHttpClient("https://confident-wildcat-124.convex.cloud");

async function testConvexDirect() {
  try {
    console.log("🔍 Testing Convex direct query...");
    
    // Test direct Convex query with different parameters
    const parents1 = await client.query("parents:getParents", { limit: 100 });
    console.log(`📊 Convex direct query (limit 100) found ${parents1.parents.length} parents`);

    const parents2 = await client.query("parents:getParents", { page: 1, limit: 50 });
    console.log(`📊 Convex direct query (page 1, limit 50) found ${parents2.parents.length} parents`);

    const parents3 = await client.query("parents:getParents", {});
    console.log(`📊 Convex direct query (no params) found ${parents3.parents.length} parents`);

    if (parents1.parents.length > 0) {
      console.log("First few parents:");
      parents1.parents.slice(0, 5).forEach(parent => {
        console.log(`- ${parent.name} (${parent.email})`);
      });
    }
    
    const payments = await client.query("payments:getPayments", { limit: 100 });
    console.log(`💰 Convex direct query found ${payments.payments.length} payments`);
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testConvexDirect();
