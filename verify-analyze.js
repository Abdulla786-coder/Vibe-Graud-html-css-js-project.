#!/usr/bin/env node
/**
 * VibeGuard - Analyze Button Verification Script
 * Run with: node verify-analyze.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n████████████████████████████████████████████');
console.log('  VibeGuard - Analyze Button Verification');
console.log('████████████████████████████████████████████\n');

let issuesFound = 0;

// Check 1: .env file exists
console.log('✓ Checking .env file...');
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('  ✗ FAIL: .env file not found');
  issuesFound++;
} else {
  console.log('  ✓ PASS: .env file exists');
  
  // Check 2: .env format
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes(' = ')) {
    console.log('  ✗ FAIL: .env has spaces around = (should be AI_API_KEY=value)');
    issuesFound++;
  } else {
    console.log('  ✓ PASS: .env format is correct (no spaces around =)');
  }
  
  // Check 3: API key is set
  if (envContent.includes('AI_API_KEY=sk-proj-') || envContent.includes('AI_API_KEY=claude-')) {
    console.log('  ✓ PASS: API key is configured');
  } else if (envContent.includes('AI_API_KEY=')) {
    console.log('  ⚠ WARN: API key is set but format looks wrong');
    issuesFound++;
  } else {
    console.log('  ✗ FAIL: AI_API_KEY not set');
    issuesFound++;
  }
}

// Check 4: Required JS files exist
console.log('\n✓ Checking required JavaScript files...');
const requiredFiles = [
  'js/scan.js',
  'js/openai-audit.js',
  'js/sast-engine.js',
  'js/scoring.js',
  'js/roadmap.js'
];

let missingFiles = 0;
requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file} - MISSING`);
    missingFiles++;
    issuesFound++;
  }
});

// Check 5: scan.html exists and includes required scripts
console.log('\n✓ Checking scan.html...');
const htmlPath = path.join(__dirname, 'scan.html');
if (fs.existsSync(htmlPath)) {
  console.log('  ✓ scan.html exists');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  const requiredInHTML = [
    'openai-audit.js',
    'analyze-btn',
    'code-input'
  ];
  
  let missingInHTML = 0;
  requiredInHTML.forEach(required => {
    if (htmlContent.includes(required)) {
      console.log(`  ✓ ${required} found in HTML`);
    } else {
      console.log(`  ✗ ${required} NOT found in HTML`);
      missingInHTML++;
      issuesFound++;
    }
  });
} else {
  console.log('  ✗ scan.html not found');
  issuesFound++;
}

// Check 6: server.js has audit endpoint
console.log('\n✓ Checking server.js...');
const serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
  console.log('  ✓ server.js exists');
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  if (serverContent.includes("app.post('/api/audit'")) {
    console.log('  ✓ /api/audit endpoint found');
  } else {
    console.log('  ✗ /api/audit endpoint NOT found');
    issuesFound++;
  }
  
  if (serverContent.includes('runAIAudit')) {
    console.log('  ✓ runAIAudit function found');
  } else {
    console.log('  ✗ runAIAudit function NOT found');
    issuesFound++;
  }
  
  if (serverContent.includes('getEffectiveApiKey')) {
    console.log('  ✓ getEffectiveApiKey function found');
  } else {
    console.log('  ✗ getEffectiveApiKey function NOT found');
    issuesFound++;
  }
} else {
  console.log('  ✗ server.js not found');
  issuesFound++;
}

// Summary
console.log('\n████████████████████████████████████████████');
if (issuesFound === 0) {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('\nNext steps:');
  console.log('  1. Start server: npm start');
  console.log('  2. Open: http://localhost:5000/scan.html');
  console.log('  3. Paste code and click "Analyze Code"');
  console.log('  4. Check terminal for logs starting with [API Audit]');
} else {
  console.log(`❌ FOUND ${issuesFound} ISSUE(S)`);
  console.log('\nPlease fix the issues above, then restart the server.');
}
console.log('████████████████████████████████████████████\n');

process.exit(issuesFound > 0 ? 1 : 0);
