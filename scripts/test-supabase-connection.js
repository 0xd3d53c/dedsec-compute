#!/usr/bin/env node

/**
 * Test Supabase Connection Script
 * 
 * This script helps verify that your Supabase credentials are working
 * before setting up GitHub Actions.
 * 
 * Usage:
 *   node scripts/test-supabase-connection.js
 * 
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_ANON_KEY
 */

const https = require('https');
const { URL } = require('url');

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testConnection() {
  log('🔍 Testing Supabase Connection...', 'cyan');
  log('');

  // Check environment variables
  if (!SUPABASE_URL) {
    log('❌ SUPABASE_URL environment variable is not set', 'red');
    log('   Please set it: export SUPABASE_URL="https://your-project.supabase.co"', 'yellow');
    process.exit(1);
  }

  if (!SUPABASE_ANON_KEY) {
    log('❌ SUPABASE_ANON_KEY environment variable is not set', 'red');
    log('   Please set it: export SUPABASE_ANON_KEY="your-anon-key"', 'yellow');
    process.exit(1);
  }

  log('✅ Environment variables are set', 'green');
  log(`   URL: ${SUPABASE_URL}`, 'blue');
  log(`   Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`, 'blue');
  log('');

  try {
    // Test 1: Basic connection
    log('🔄 Test 1: Basic connection...', 'cyan');
    const healthResponse = await makeRequest(`${SUPABASE_URL}/rest/v1/`);
    
    if (healthResponse.statusCode === 200) {
      log('✅ Basic connection successful', 'green');
    } else {
      log(`❌ Basic connection failed with status ${healthResponse.statusCode}`, 'red');
      log(`   Response: ${healthResponse.body}`, 'yellow');
    }

    // Test 2: Check if scheduled_maintenance function exists
    log('🔄 Test 2: Checking scheduled_maintenance function...', 'cyan');
    const maintenanceResponse = await makeRequest(
      `${SUPABASE_URL}/rest/v1/rpc/scheduled_maintenance`,
      { method: 'POST' }
    );

    if (maintenanceResponse.statusCode === 200) {
      log('✅ scheduled_maintenance function is available', 'green');
      log(`   Response: ${maintenanceResponse.body}`, 'blue');
    } else if (maintenanceResponse.statusCode === 404) {
      log('⚠️ scheduled_maintenance function not found', 'yellow');
      log('   You may need to run the SQL migration scripts', 'yellow');
    } else {
      log(`❌ Function test failed with status ${maintenanceResponse.statusCode}`, 'red');
      log(`   Response: ${maintenanceResponse.body}`, 'yellow');
    }

    // Test 3: Check cron_job_health view
    log('🔄 Test 3: Checking cron_job_health view...', 'cyan');
    const healthViewResponse = await makeRequest(`${SUPABASE_URL}/rest/v1/cron_job_health`);

    if (healthViewResponse.statusCode === 200) {
      log('✅ cron_job_health view is available', 'green');
      log(`   Response: ${healthViewResponse.body}`, 'blue');
    } else if (healthViewResponse.statusCode === 404) {
      log('⚠️ cron_job_health view not found', 'yellow');
      log('   You may need to run the SQL migration scripts', 'yellow');
    } else {
      log(`❌ Health view test failed with status ${healthViewResponse.statusCode}`, 'red');
      log(`   Response: ${healthViewResponse.body}`, 'yellow');
    }

    log('');
    log('🎉 Connection test completed!', 'green');
    log('');
    log('📋 Next steps:', 'cyan');
    log('1. If all tests passed, your GitHub Actions should work', 'blue');
    log('2. If functions/views are missing, run the SQL migration scripts', 'blue');
    log('3. Add the environment variables as GitHub repository secrets', 'blue');

  } catch (error) {
    log(`❌ Connection test failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the test
testConnection().catch((error) => {
  log(`❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
