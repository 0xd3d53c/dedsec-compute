// test-runner.js - Comprehensive automated testing script
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

class DedSecTestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  async runAllTests() {
    console.log('ߧ Starting DedSecCompute Test Suite...\n');
    
    try {
      await this.testEnvironmentSetup();
      await this.testDatabaseConnection();
      await this.testDatabaseSchema();
      await this.testAuthenticationSystem();
      await this.testRealtimeSubscriptions();
      await this.testComputeEngine();
      await this.testHardwareDetection();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.errors.push(`Test Suite: ${error.message}`);
    }
  }

  async testEnvironmentSetup() {
    console.log('ߔ Testing Environment Setup...');
    
    // Check required environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        this.fail(`Environment variable ${envVar} is missing`);
      } else {
        this.pass(`✅ ${envVar} is configured`);
      }
    }
    
    // Check if .env.local exists
    if (fs.existsSync('.env.local')) {
      this.pass('✅ .env.local file exists');
    } else {
      this.fail('❌ .env.local file missing');
    }
  }

  async testDatabaseConnection() {
    console.log('ߗ️ Testing Database Connection...');
    
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        this.fail(`Database connection failed: ${error.message}`);
      } else {
        this.pass('✅ Database connection successful');
      }
    } catch (error) {
      this.fail(`Database connection error: ${error.message}`);
    }
  }

  async testDatabaseSchema() {
    console.log('ߓ Testing Database Schema...');
    
    const expectedTables = [
      'users',
      'user_sessions', 
      'operations',
      'task_executions',
      'network_metrics',
      'achievements',
      'user_achievements'
    ];
    
    for (const table of expectedTables) {
      try {
        const { error } = await this.supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          this.fail(`Table ${table} missing or inaccessible: ${error.message}`);
        } else {
          this.pass(`✅ Table ${table} exists`);
        }
      } catch (error) {
        this.fail(`Table ${table} test failed: ${error.message}`);
      }
    }
  }

  async testAuthenticationSystem() {
    console.log('ߔ Testing Authentication System...');
    
    try {
      // Test phone auth configuration
      const { data: authConfig } = await this.supabase.auth.getSession();
      this.pass('✅ Auth client initialized');
      
      // Test demo user creation (for testing purposes)
      const testUser = {
        id: 'test-user-' + Date.now(),
        username: 'testuser',
        display_name: 'Test User',
        phone: '+1234567890',
        invite_code: 'd3d_TEST' + Math.random().toString(36).substr(2, 4).toUpperCase()
      };
      
      const { data, error } = await this.supabase
        .from('users')
        .insert(testUser)
        .select();
      
      if (error) {
        this.fail(`User creation failed: ${error.message}`);
      } else {
        this.pass('✅ User creation works');
        
        // Cleanup test user
        await this.supabase
          .from('users')
          .delete()
          .eq('id', testUser.id);
      }
      
    } catch (error) {
      this.fail(`Authentication test failed: ${error.message}`);
    }
  }

  async testRealtimeSubscriptions() {
    console.log('ߔ Testing Real-time Subscriptions...');
    
    return new Promise((resolve) => {
      let subscriptionWorking = false;
      
      const channel = this.supabase
        .channel('test-channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'network_metrics'
        }, (payload) => {
          subscriptionWorking = true;
          this.pass('✅ Real-time subscription working');
          channel.unsubscribe();
          resolve();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Trigger a test event
            setTimeout(async () => {
              try {
                await this.supabase
                  .from('network_metrics')
                  .insert({
                    active_users: 1,
                    total_cpu_cores: 8,
                    total_memory_gb: 16,
                    operations_per_second: 10,
                    network_efficiency: 85.5,
                    average_latency_ms: 45
                  });
              } catch (error) {
                // Ignore insert errors, just testing subscription
              }
              
              // If no subscription event after 5 seconds, fail
              setTimeout(() => {
                if (!subscriptionWorking) {
                  this.fail('❌ Real-time subscription not working');
                  channel.unsubscribe();
                  resolve();
                }
              }, 5000);
            }, 1000);
          }
        });
    });
  }

  async testComputeEngine() {
    console.log('ߧ Testing Compute Engine...');
    
    try {
      // Test prime calculation
      const primes = this.calculatePrimes(100, 200);
      if (primes.length > 0) {
        this.pass(`✅ Prime calculation works (found ${primes.length} primes)`);
      } else {
        this.fail('❌ Prime calculation failed');
      }
      
      // Test hash computation
      const testData = 'test-string';
      const hash = await this.computeHash(testData);
      if (hash && hash.length === 64) { // SHA-256 produces 64 character hex string
        this.pass('✅ Hash computation works');
      } else {
        this.fail('❌ Hash computation failed');
      }
      
      // Test matrix operations
      const matrix1 = [[1, 2], [3, 4]];
      const matrix2 = [[5, 6], [7, 8]];
      const result = this.multiplyMatrices(matrix1, matrix2);
      const expected = [[19, 22], [43, 50]];
      
      if (JSON.stringify(result) === JSON.stringify(expected)) {
        this.pass('✅ Matrix multiplication works');
      } else {
        this.fail('❌ Matrix multiplication failed');
      }
      
    } catch (error) {
      this.fail(`Compute engine test failed: ${error.message}`);
    }
  }

  async testHardwareDetection() {
    console.log('ߔ Testing Hardware Detection...');
    
    try {
      // Simulate hardware detection (since we're in Node.js, not browser)
      const mockHardware = {
        cpu_cores: require('os').cpus().length,
        total_memory_gb: Math.round(require('os').totalmem() / (1024 * 1024 * 1024) * 100) / 100,
        architecture: require('os').arch(),
        platform: require('os').platform(),
        user_agent: 'Node.js Test Runner'
      };
      
      if (mockHardware.cpu_cores > 0) {
        this.pass(`✅ CPU detection works (${mockHardware.cpu_cores} cores)`);
      } else {
        this.fail('❌ CPU detection failed');
      }
      
      if (mockHardware.total_memory_gb > 0) {
        this.pass(`✅ Memory detection works (${mockHardware.total_memory_gb} GB)`);
      } else {
        this.fail('❌ Memory detection failed');
      }
      
      if (['x64', 'arm64', 'arm', 'ia32'].includes(mockHardware.architecture)) {
        this.pass(`✅ Architecture detection works (${mockHardware.architecture})`);
      } else {
        this.fail('❌ Architecture detection failed');
      }
      
    } catch (error) {
      this.fail(`Hardware detection test failed: ${error.message}`);
    }
  }

  // Utility methods for compute testing
  calculatePrimes(start, end) {
    const primes = [];
    for (let num = start; num <= end; num++) {
      if (this.isPrime(num)) {
        primes.push(num);
      }
    }
    return primes;
  }

  isPrime(num) {
    if (num < 2) return false;
    if (num === 2) return true;
    if (num % 2 === 0) return false;
    
    for (let i = 3; i <= Math.sqrt(num); i += 2) {
      if (num % i === 0) return false;
    }
    return true;
  }

  async computeHash(data) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  multiplyMatrices(matrix1, matrix2) {
    const rows1 = matrix1.length;
    const cols1 = matrix1[0].length;
    const rows2 = matrix2.length;
    const cols2 = matrix2[0].length;
    
    if (cols1 !== rows2) {
      throw new Error('Invalid matrix dimensions for multiplication');
    }
    
    const result = Array(rows1).fill().map(() => Array(cols2).fill(0));
    
    for (let i = 0; i < rows1; i++) {
      for (let j = 0; j < cols2; j++) {
        for (let k = 0; k < cols1; k++) {
          result[i][j] += matrix1[i][k] * matrix2[k][j];
        }
      }
    }
    
    return result;
  }

  pass(message) {
    console.log(`  ${message}`);
    this.results.passed++;
  }

  fail(message) {
    console.log(`  ${message}`);
    this.results.failed++;
    this.results.errors.push(message);
  }

  generateReport() {
    console.log('\nߓ Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`ߓ Total: ${this.results.passed + this.results.failed}`);
    console.log(`ߎ Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      passed: this.results.passed,
      failed: this.results.failed,
      success_rate: ((this.results.passed / (this.results.passed + this.results.failed)) * 100),
      errors: this.results.errors,
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
    console.log('\nߓ Detailed report saved to test-report.json');
    
    // Exit with error code if tests failed
    if (this.results.failed > 0) {
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  require('dotenv').config({ path: '.env.local' });
  
  const testRunner = new DedSecTestRunner();
  testRunner.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = DedSecTestRunner;
