const { ConvexHttpClient } = require("convex/browser");

// Use the correct Convex URL from your environment
const client = new ConvexHttpClient("https://confident-wildcat-124.convex.cloud");

async function restoreSampleData() {
  try {
    console.log("🚀 Restoring sample data...");
    
    // Sample parents data
    const sampleParents = [
      {
        name: "Kevin Houston",
        email: "kevin.houston@email.com",
        phone: "+1-555-0101",
        address: "123 Basketball Lane, Sports City, SC 12345",
        emergencyContact: "Sarah Houston (Wife)",
        emergencyPhone: "+1-555-0102",
        status: "active",
        notes: "Parent of star player. Very engaged with the program."
      },
      {
        name: "Casey Houston", 
        email: "casey.houston@email.com",
        phone: "+1-555-0103",
        address: "456 Court Street, Hoops Town, HT 67890",
        emergencyContact: "Mike Houston (Husband)",
        emergencyPhone: "+1-555-0104",
        status: "active",
        notes: "Excellent communication. Always on time for payments."
      },
      {
        name: "Nate Houston",
        email: "nate.houston@email.com", 
        phone: "+1-555-0105",
        address: "789 Dribble Drive, Ball City, BC 11111",
        emergencyContact: "Lisa Houston (Wife)",
        emergencyPhone: "+1-555-0106",
        status: "active",
        notes: "New to the program. Very enthusiastic about basketball."
      },
      {
        name: "Matt Houston",
        email: "matt.houston@email.com",
        phone: "+1-555-0107", 
        address: "321 Slam Dunk Street, Court City, CC 22222",
        emergencyContact: "Jennifer Houston (Wife)",
        emergencyPhone: "+1-555-0108",
        status: "active",
        notes: "Long-time supporter. Has two kids in the program."
      },
      {
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1-555-0109",
        address: "654 Free Throw Avenue, Basket Town, BT 33333",
        emergencyContact: "John Johnson (Husband)",
        emergencyPhone: "+1-555-0110",
        status: "active",
        notes: "Very organized parent. Helps with team events."
      }
    ];

    console.log("📋 Creating parents...");
    const createdParents = [];
    
    for (const parent of sampleParents) {
      try {
        const result = await client.mutation("parents:createParent", parent);
        console.log(`✅ Created parent: ${parent.name} (ID: ${result})`);
        createdParents.push({ ...parent, _id: result });
      } catch (err) {
        console.log(`⚠️  Error creating parent ${parent.name}: ${err.message}`);
      }
    }

    // Create sample payments for the parents
    console.log("💰 Creating sample payments...");
    
    const samplePayments = [];
    const currentDate = new Date();
    
    // Create payments for each parent
    for (let i = 0; i < createdParents.length; i++) {
      const parent = createdParents[i];
      
      // Create 2-3 payments per parent with different statuses
      const payments = [
        {
          parentId: parent._id,
          amount: 250.00,
          status: "completed",
          dueDate: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).getTime(), // 30 days ago
          paidAt: new Date(currentDate.getTime() - 25 * 24 * 60 * 60 * 1000).getTime(), // 25 days ago
          program: "yearly-program",
          description: "Monthly Training Fee - January",
          method: "credit_card"
        },
        {
          parentId: parent._id,
          amount: 250.00,
          status: "completed", 
          dueDate: new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000).getTime(), // 60 days ago
          paidAt: new Date(currentDate.getTime() - 55 * 24 * 60 * 60 * 1000).getTime(), // 55 days ago
          program: "yearly-program",
          description: "Monthly Training Fee - December",
          method: "bank_transfer"
        }
      ];
      
      // Add an overdue payment for some parents
      if (i % 2 === 0) {
        payments.push({
          parentId: parent._id,
          amount: 250.00,
          status: "overdue",
          dueDate: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000).getTime(), // 5 days ago
          program: "yearly-program", 
          description: "Monthly Training Fee - February",
          method: "credit_card"
        });
      }
      
      samplePayments.push(...payments);
    }

    // Create the payments
    for (const payment of samplePayments) {
      try {
        const result = await client.mutation("payments:createPayment", payment);
        console.log(`✅ Created payment: $${payment.amount} for ${payment.description}`);
      } catch (err) {
        console.log(`⚠️  Error creating payment: ${err.message}`);
      }
    }
    
    console.log("🎉 Sample data restoration completed!");
    
    // Test the data
    console.log("🔍 Testing data retrieval...");
    const parents = await client.query("parents:getParents", { limit: 10 });
    console.log(`📊 Found ${parents.parents.length} parents in database`);
    
    const payments = await client.query("payments:getPayments", { limit: 10 });
    console.log(`💰 Found ${payments.payments.length} payments in database`);
    
  } catch (error) {
    console.error("❌ Restoration failed:", error);
  }
}

restoreSampleData();
