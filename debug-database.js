const { ConvexHttpClient } = require("convex/browser");

// Use the correct Convex URL from your environment
const client = new ConvexHttpClient("https://confident-wildcat-124.convex.cloud");

async function debugDatabase() {
  try {
    console.log("🔍 Debugging database state...");
    
    // Try to get the specific parent we know exists
    try {
      const kevinParent = await client.query("parents:getParent", { id: "j579sdty29xfz5sjaqwqartzx57qy85m" });
      console.log("✅ Found Kevin Houston directly:", kevinParent?.name);
    } catch (err) {
      console.log("❌ Could not find Kevin Houston directly:", err.message);
    }
    
    // Try to get the test parent we just created
    try {
      const testParent = await client.query("parents:getParent", { id: "j577zhdvr35msp10zxrv45s5bn7qydn3" });
      console.log("✅ Found Test Parent directly:", testParent?.name);
    } catch (err) {
      console.log("❌ Could not find Test Parent directly:", err.message);
    }
    
    // Try different query parameters
    console.log("\n🔍 Testing different query parameters:");
    
    const queries = [
      { params: {}, desc: "No parameters" },
      { params: { limit: 1 }, desc: "Limit 1" },
      { params: { limit: 10 }, desc: "Limit 10" },
      { params: { limit: 100 }, desc: "Limit 100" },
      { params: { page: 1, limit: 10 }, desc: "Page 1, Limit 10" },
      { params: { page: 1, limit: 100 }, desc: "Page 1, Limit 100" },
      { params: { status: "active" }, desc: "Status active" },
      { params: { status: "active", limit: 100 }, desc: "Status active, Limit 100" },
    ];
    
    for (const query of queries) {
      try {
        const result = await client.query("parents:getParents", query.params);
        console.log(`  ${query.desc}: ${result.parents.length} parents`);
        if (result.parents.length > 0) {
          console.log(`    First parent: ${result.parents[0].name}`);
        }
      } catch (err) {
        console.log(`  ${query.desc}: ERROR - ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

debugDatabase();
