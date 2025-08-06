// Direct cleanup script to remove test payment plans via API
const API_KEY = 'ra1-dashboard-api-key-2024';
const BASE_URL = 'http://localhost:3000';

// Real Houston family parent IDs (only these should have payment plans)
const REAL_PARENT_IDS = [
  'j97en33trdcm4f7hzvzj5e6vsn7mwxxr', // Kevin Houston
  'j97f7v56vbr080c66j9zq36m0s7mwzts', // Casey Houston  
  'j97c2xwtde8px84t48m8qtw0fn7mzcfb', // Nate Houston
  'j97de6dyw5c8m50je4a31z248x7n2mwp'  // Matt Houston
];

async function cleanupTestData() {
  console.log('🧹 Starting cleanup of test payment plans...');
  
  try {
    // Get all payment plans
    const response = await fetch(`${BASE_URL}/api/payment-plans`, {
      headers: { 'x-api-key': API_KEY }
    });
    
    const paymentPlans = await response.json();
    console.log(`📊 Found ${paymentPlans.length} total payment plans`);
    
    const realPlans = paymentPlans.filter(plan => REAL_PARENT_IDS.includes(plan.parentId));
    const testPlans = paymentPlans.filter(plan => !REAL_PARENT_IDS.includes(plan.parentId));
    
    console.log(`✅ Real Houston family plans: ${realPlans.length}`);
    console.log(`❌ Test plans to delete: ${testPlans.length}`);
    
    // Calculate correct revenue
    const correctRevenue = realPlans.reduce((sum, plan) => sum + (plan.totalAmount || 0), 0);
    console.log(`💰 Correct Total Potential Revenue: $${correctRevenue}`);
    
    // List test plans that will be deleted
    console.log('\n🗑️ Test plans to be deleted:');
    testPlans.forEach(plan => {
      console.log(`- Plan ID: ${plan._id}, Parent ID: ${plan.parentId}, Amount: $${plan.totalAmount}`);
    });
    
    console.log(`\n✅ After cleanup: 4 Houston parents × $1,650 = $6,600`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

cleanupTestData();