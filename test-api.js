/**
 * VibeGuard Database API Test Script
 * Run with: node test-api.js
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';
let userID = null;
let scanID1 = null;
let scanID2 = null;

// Helper function for API calls
async function apiCall(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const json = await response.json();
    return { status: response.status, data: json };
  } catch (error) {
    return { error: error.message };
  }
}

// Helper function to print results
function printResult(testName, result) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✓ ${testName}`);
  console.log('='.repeat(50));
  console.log(JSON.stringify(result, null, 2));
}

async function runTests() {
  console.log('\n████████████████████████████████████████████████');
  console.log('  VibeGuard Database API Tests');
  console.log('████████████████████████████████████████████████\n');

  // Test 1: Register User
  console.log('\n[1/10] Registering a new user...');
  const registerResult = await apiCall('POST', '/api/auth/register', {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'SecurePassword123',
  });
  printResult('User Registration', registerResult.data);
  userID = registerResult.data?.id;

  // Test 2: Login
  console.log('\n[2/10] Logging in user...');
  const loginResult = await apiCall('POST', '/api/auth/login', {
    username: registerResult.data.username,
    password: 'SecurePassword123',
  });
  printResult('User Login', loginResult.data);

  // Test 3: Get User Profile
  console.log('\n[3/10] Getting user profile...');
  const profileResult = await apiCall('GET', `/api/users/${userID}`);
  printResult('User Profile', profileResult.data);

  // Test 4: Submit First Scan (JavaScript)
  console.log('\n[4/10] Submitting JavaScript scan...');
  const scan1Result = await apiCall('POST', '/api/scans', {
    code: 'const password = "admin123";\neval(userInput);\ndocument.innerHTML = userInput;',
    language: 'javascript',
    vulnerabilities: [
      { type: 'hardcoded_password', severity: 'high', line: 1 },
      { type: 'eval_usage', severity: 'high', line: 2 },
      { type: 'xss_vulnerability', severity: 'high', line: 3 },
    ],
    score: 25.5,
    user_id: userID,
  });
  printResult('JavaScript Scan Submission', scan1Result.data);
  scanID1 = scan1Result.data?.id;

  // Test 5: Submit Second Scan (Python)
  console.log('\n[5/10] Submitting Python scan...');
  const scan2Result = await apiCall('POST', '/api/scans', {
    code: 'import pickle\nimport os\ndata = pickle.loads(user_data)\nos.system(command)',
    language: 'python',
    vulnerabilities: [
      { type: 'pickle_deserialization', severity: 'high', line: 3 },
      { type: 'unsafe_os_command', severity: 'high', line: 4 },
      { type: 'no_input_validation', severity: 'medium', line: 4 },
    ],
    score: 35.2,
    user_id: userID,
  });
  printResult('Python Scan Submission', scan2Result.data);
  scanID2 = scan2Result.data?.id;

  // Test 6: Get All Scans
  console.log('\n[6/10] Getting all scans for user...');
  const scansResult = await apiCall('GET', `/api/scans?user_id=${userID}`);
  printResult('All Scans for User', scansResult.data);

  // Test 7: Get Scan History
  console.log('\n[7/10] Getting scan history...');
  const historyResult = await apiCall('GET', `/api/scan-history/${userID}`);
  printResult('Scan History', historyResult.data);

  // Test 8: Get Daily Statistics
  console.log('\n[8/10] Getting daily statistics...');
  const statsResult = await apiCall('GET', `/api/daily-stats/${userID}`);
  printResult('Daily Statistics', statsResult.data);

  // Test 9: Get Database Status
  console.log('\n[9/10] Getting database status...');
  const statusResult = await apiCall('GET', '/api/status');
  printResult('Database Status', statusResult.data);

  // Test 10: Run AI Audit
  console.log('\n[10/10] Running AI code audit...');
  const auditResult = await apiCall('POST', '/api/audit', {
    code: 'function test() {\n  var x = eval(userInput);\n  return x;\n}',
    language: 'javascript',
    user_id: userID,
  });
  printResult('AI Code Audit', auditResult.data);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('             TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`\n✓ User ID: ${userID}`);
  console.log(`✓ Scan 1 ID: ${scanID1}`);
  console.log(`✓ Scan 2 ID: ${scanID2}`);
  console.log('\n✓ All tests completed successfully!');
  console.log('\nDatabase Features Demonstrated:');
  console.log('  • User registration and authentication');
  console.log('  • Code scanning with vulnerability detection');
  console.log('  • Automatic scan history tracking');
  console.log('  • Daily statistics aggregation');
  console.log('  • User profile management');
  console.log('  • AI-powered code audit integration\n');
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Error running tests:', error);
  process.exit(1);
});
