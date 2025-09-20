const { ConvexHttpClient } = require("convex/browser");

// Use the correct Convex URL from your environment
const client = new ConvexHttpClient("https://confident-wildcat-124.convex.cloud");

async function testDebugQuery() {
  try {
    console.log("🔍 Testing debug query...");
    
    const result = await client.query("debug:debugParents", {});
    console.log(`📊 Debug query found ${result.count} parents`);
    
    result.parents.forEach((parent, index) => {
      console.log(`${index + 1}. ${parent.name} (${parent.email}) - Status: ${parent.status}`);
    });
    
  } catch (error) {
    console.error("❌ Debug query failed:", error);
  }
}

testDebugQuery();
