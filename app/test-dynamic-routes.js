#!/usr/bin/env node

/**
 * Test script for dynamic route functionality
 * Run with: node test-dynamic-routes.js [BASE_URL]
 * Example: node test-dynamic-routes.js https://your-app.vercel.app
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';
const testId = 'test-' + Date.now();

console.log(`🧪 Testing dynamic routes on: ${baseUrl}`);
console.log(`📝 Using test ID: ${testId}`);

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🔍 Testing ${name}...`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.text();
    let parsedData;
    
    try {
      parsedData = JSON.parse(data);
    } catch {
      parsedData = data;
    }
    
    console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
    console.log(`   📄 Response:`, parsedData);
    
    return { success: response.ok, status: response.status, data: parsedData };
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const results = {};
  
  // Test 1: Health check (baseline)
  results.health = await testEndpoint(
    'Health Check',
    `${baseUrl}/api/health`
  );
  
  // Test 2: Parents list (static route)
  results.parentsList = await testEndpoint(
    'Parents List',
    `${baseUrl}/api/parents`
  );
  
  // Test 3: Dynamic route (the problematic one)
  results.dynamicRoute = await testEndpoint(
    'Dynamic Route GET',
    `${baseUrl}/api/parents/${testId}`
  );
  
  // Test 4: Alternative delete endpoint (POST)
  results.alternativeDeletePost = await testEndpoint(
    'Alternative Delete (POST)',
    `${baseUrl}/api/parents/delete`,
    {
      method: 'POST',
      body: JSON.stringify({ parentId: testId })
    }
  );
  
  // Test 5: Alternative delete endpoint (DELETE with query)
  results.alternativeDeleteQuery = await testEndpoint(
    'Alternative Delete (DELETE + Query)',
    `${baseUrl}/api/parents/delete?id=${testId}`,
    { method: 'DELETE' }
  );
  
  // Test 6: Debug endpoint
  results.debug = await testEndpoint(
    'Debug Routes',
    `${baseUrl}/api/debug/routes?testId=${testId}`
  );
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('='.repeat(50));
  
  const passed = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;
  
  console.log(`✅ Passed: ${passed}/${total} tests`);
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅' : '❌';
    const statusCode = result.status ? ` (${result.status})` : '';
    console.log(`   ${status} ${test}${statusCode}`);
  });
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('='.repeat(50));
  
  if (!results.dynamicRoute?.success) {
    console.log('❌ Dynamic routes are not working. Use alternative delete endpoint.');
    console.log('   Update frontend to use: POST /api/parents/delete');
  } else {
    console.log('✅ Dynamic routes are working. You can use standard REST endpoints.');
  }
  
  if (results.alternativeDeletePost?.success || results.alternativeDeleteQuery?.success) {
    console.log('✅ Alternative delete endpoints are working as backup.');
  }
  
  console.log('\n🚀 Next steps:');
  console.log('1. Deploy these changes to Vercel');
  console.log('2. Run this test against your production URL');
  console.log('3. Update frontend components based on results');
}

// Run the tests
runTests().catch(console.error);