const { ConvexHttpClient } = require("convex/browser");

// Use the correct Convex URL from your environment
const client = new ConvexHttpClient("https://confident-wildcat-124.convex.cloud");

async function testSingleParent() {
  try {
    console.log("🧪 Testing single parent creation...");
    
    // Test creating a single parent
    const testParent = {
      name: "Test Parent",
      email: "test@example.com",
      phone: "1234567890",
      address: "123 Test Street",
      emergencyContact: "Test Emergency",
      emergencyPhone: "0987654321",
      status: "active"
    };
    
    console.log("Creating test parent...");
    const result = await client.mutation("parents:createParent", testParent);
    console.log(`✅ Created test parent with ID: ${result}`);
    
    // Query all parents
    console.log("Querying all parents...");
    const parents = await client.query("parents:getParents", { limit: 100 });
    console.log(`📊 Found ${parents.parents.length} parents total`);
    
    parents.parents.forEach((parent, index) => {
      console.log(`${index + 1}. ${parent.name} (${parent.email}) - ID: ${parent._id}`);
    });
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testSingleParent();
