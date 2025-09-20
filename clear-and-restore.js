const { ConvexHttpClient } = require("convex/browser");

// Use the correct Convex URL from your environment
const client = new ConvexHttpClient("https://confident-wildcat-124.convex.cloud");

// Real parent data from your Vercel deployment (first 16 unique parents)
const realParents = [
  {
    name: "Kevin Houston",
    email: "khouston721@gmail.com",
    phone: "9088101720",
    address: "612 Colonial Arms Road",
    emergencyContact: "Kevin Houston",
    emergencyPhone: "9088101720",
    status: "active",
    notes: "mj"
  },
  {
    name: "Angelys Castillo",
    email: "cellaumbrella@yahoo.com",
    phone: "9737135641",
    address: "10 Winding Ridge Rd New Jersey 7849",
    emergencyContact: "Marcella Castillo",
    emergencyPhone: "9737135641",
    status: "active"
  },
  {
    name: "Sterling Monaghan",
    email: "monaghanclan82@gmail.com",
    phone: "2124705019",
    address: "1076 River rd New Jersey 8628",
    emergencyContact: "Tabby Monaghan",
    emergencyPhone: "2124705019",
    status: "active"
  },
  {
    name: "Matthew Rowan",
    email: "mwrmma@yahoo.com",
    phone: "9734187416",
    address: "29 Maple Terrace New Jersey 7874",
    emergencyContact: "Mike Rowan",
    emergencyPhone: "9734187416",
    status: "active"
  },
  {
    name: "Lawrence Haywood",
    email: "lawrenda.henrywillis@gmail.com",
    phone: "8622209220",
    address: "19 Killdeer Dr New Jersey 7840",
    emergencyContact: "Lawrenda Henry-Willis",
    emergencyPhone: "8622209220",
    status: "active"
  },
  {
    name: "Nolan Murray",
    email: "jaynamurray@gmail.com",
    phone: "9148059101",
    address: "2 Woodcott Drive New Jersey 07419-1368",
    emergencyContact: "Jayna Murray",
    emergencyPhone: "9148059101",
    status: "active"
  },
  {
    name: "Sunny N'Gom",
    email: "naomizoko@gmail.com",
    phone: "9735700476",
    address: "33 Mill Street Apt 10X New Jersey 7860",
    emergencyContact: "Naomi Zoko",
    emergencyPhone: "9735700476",
    status: "active"
  },
  {
    name: "Natalee Griffin",
    email: "nfran82860@aol.com",
    phone: "8622686770",
    address: "2 Highview Road New Jersey 7860",
    emergencyContact: "Natarica Franklin",
    emergencyPhone: "8622686770",
    status: "active"
  },
  {
    name: "Drew Pohl",
    email: "mars_pohl@earthlink.net",
    phone: "9732074782",
    address: "2 Stonehill road New Jersey 7419",
    emergencyContact: "Rob Pohl",
    emergencyPhone: "9732074782",
    status: "active"
  },
  {
    name: "Michael Pohl",
    email: "robertjamespohl@gmail.com",
    phone: "9732074782",
    address: "2 Stonehill road New Jersey 7419",
    emergencyContact: "Rob Pohl",
    emergencyPhone: "9732074782",
    status: "active"
  },
  {
    name: "Eduardo Sanchez",
    email: "ssanchez8519@gmail.com",
    phone: "9734139467",
    address: "1 Chestnut Road New Jersey 7832",
    emergencyContact: "Shawnna Sanchez",
    emergencyPhone: "9734139467",
    status: "active"
  },
  {
    name: "Shawnna Sanchez",
    email: "ssanchez8519@gmail.com",
    phone: "9734139467",
    address: "1 Chestnut Road New Jersey 7832",
    emergencyContact: "Shawnna Sanchez",
    emergencyPhone: "9734139467",
    status: "active"
  },
  {
    name: "Marcus Parker",
    email: "brie.parker@cbrealty.com",
    phone: "9739700870",
    address: "3213 state rt 94 New Jersey 7416",
    emergencyContact: "George Parker",
    emergencyPhone: "9739700870",
    status: "active"
  },
  {
    name: "Sennen Doone",
    email: "dylandoone@gmail.com",
    phone: "8622660765",
    address: "75 Mulford Rd New Jersey 7848",
    emergencyContact: "Dylan Doone",
    emergencyPhone: "8622660765",
    status: "active"
  },
  {
    name: "Damion Grant",
    email: "jilliannemel@gmail.com",
    phone: "9739328380",
    address: "30 lakeview drive New Jersey 7419",
    emergencyContact: "Jill Grant",
    emergencyPhone: "9739328380",
    status: "active"
  },
  {
    name: "Troy Houston",
    email: "elizkc@hotmail.com",
    phone: "9172150749",
    address: "612 Colonial Arms Road New Jersey 7083",
    emergencyContact: "Casey Houston",
    emergencyPhone: "9172150749",
    status: "active"
  }
];

async function clearAndRestoreData() {
  try {
    console.log("🧹 Clearing existing data...");
    
    // Get all existing parents and payments to delete them
    const existingParents = await client.query("parents:getParents", { limit: 100 });
    const existingPayments = await client.query("payments:getPayments", { limit: 100 });
    
    // Delete existing payments first (due to foreign key constraints)
    for (const payment of existingPayments.payments) {
      try {
        await client.mutation("payments:deletePayment", { id: payment._id });
        console.log(`🗑️  Deleted payment: ${payment._id}`);
      } catch (err) {
        console.log(`⚠️  Error deleting payment ${payment._id}: ${err.message}`);
      }
    }
    
    // Delete existing parents
    for (const parent of existingParents.parents) {
      try {
        await client.mutation("parents:deleteParent", { id: parent._id });
        console.log(`🗑️  Deleted parent: ${parent.name}`);
      } catch (err) {
        console.log(`⚠️  Error deleting parent ${parent.name}: ${err.message}`);
      }
    }
    
    console.log("🚀 Restoring your real parent data...");
    
    console.log("📋 Creating parents...");
    const createdParents = [];
    
    for (const parent of realParents) {
      try {
        const result = await client.mutation("parents:createParent", parent);
        console.log(`✅ Created parent: ${parent.name} (ID: ${result})`);
        createdParents.push({ ...parent, _id: result });
      } catch (err) {
        console.log(`⚠️  Error creating parent ${parent.name}: ${err.message}`);
      }
    }

    // Create some basic payments for Kevin Houston (the main user)
    console.log("💰 Creating sample payments for Kevin Houston...");
    
    const kevinParent = createdParents.find(p => p.name === "Kevin Houston");
    if (kevinParent) {
      const samplePayments = [
        {
          parentId: kevinParent._id,
          amount: 1650,
          status: "paid",
          dueDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        },
        {
          parentId: kevinParent._id,
          amount: 100,
          status: "paid",
          dueDate: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
        },
        {
          parentId: kevinParent._id,
          amount: 150,
          status: "pending",
          dueDate: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
        }
      ];

      for (const payment of samplePayments) {
        try {
          const result = await client.mutation("payments:createPayment", payment);
          console.log(`✅ Created payment: $${payment.amount} - ${payment.status}`);
        } catch (err) {
          console.log(`⚠️  Error creating payment: ${err.message}`);
        }
      }
    }
    
    console.log("🎉 Real data restoration completed!");
    
    // Test the data
    console.log("🔍 Testing data retrieval...");
    const parents = await client.query("parents:getParents", { limit: 50 });
    console.log(`📊 Found ${parents.parents.length} parents in database`);
    
    const payments = await client.query("payments:getPayments", { limit: 50 });
    console.log(`💰 Found ${payments.payments.length} payments in database`);
    
  } catch (error) {
    console.error("❌ Restoration failed:", error);
  }
}

clearAndRestoreData();
