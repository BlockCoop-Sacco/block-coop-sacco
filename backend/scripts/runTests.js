#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Comprehensive Test Runner for M-Pesa Integration
 * 
 * This script runs different types of tests based on the provided arguments:
 * - unit: Run unit tests only
 * - integration: Run integration tests only
 * - e2e: Run end-to-end tests only
 * - sandbox: Run M-Pesa sandbox tests (requires valid credentials)
 * - all: Run all tests except sandbox
 * - coverage: Run all tests with coverage report
 */

class TestRunner {
  constructor() {
    this.testTypes = {
      unit: 'tests/unit/**/*.test.js',
      integration: 'tests/integration/**/*.test.js',
      e2e: 'tests/e2e/**/*.test.js',
      performance: 'tests/performance/**/*.test.js',
      security: 'tests/security/**/*.test.js',
      sandbox: 'tests/sandbox/**/*.js'
    };

    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: null,
      duration: 0,
      suites: []
    };

    this.startTime = null;
  }

  async run(testType = 'all') {
    console.log('🧪 M-Pesa Integration Test Runner');
    console.log('==================================\n');

    this.startTime = Date.now();

    // Ensure test environment is set up
    await this.setupTestEnvironment();

    try {
      switch (testType.toLowerCase()) {
        case 'unit':
          await this.runUnitTests();
          break;
        case 'integration':
          await this.runIntegrationTests();
          break;
        case 'e2e':
          await this.runE2ETests();
          break;
        case 'performance':
          await this.runPerformanceTests();
          break;
        case 'security':
          await this.runSecurityTests();
          break;
        case 'sandbox':
          await this.runSandboxTests();
          break;
        case 'coverage':
          await this.runWithCoverage();
          break;
        case 'ci':
          await this.runCITests();
          break;
        case 'all':
        default:
          await this.runAllTests();
          break;
      }

      await this.generateTestReport();
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      await this.generateTestReport(error);
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');

    // Ensure test directories exist
    const testDirs = ['tests/logs', 'coverage'];
    for (const dir of testDirs) {
      const fullPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`   Created directory: ${dir}`);
      }
    }

    // Check if .env.test exists
    const envTestPath = path.join(__dirname, '..', '.env.test');
    if (!fs.existsSync(envTestPath)) {
      console.log('⚠️  Warning: .env.test file not found. Some tests may fail.');
      console.log('   Please copy .env.example to .env.test and configure test values.');
    }

    console.log('✅ Test environment ready\n');
  }

  async runUnitTests() {
    console.log('🔬 Running Unit Tests...');
    await this.runJest(this.testTypes.unit, 'Unit Tests');
  }

  async runIntegrationTests() {
    console.log('🔗 Running Integration Tests...');
    await this.runJest(this.testTypes.integration, 'Integration Tests');
  }

  async runE2ETests() {
    console.log('🎭 Running End-to-End Tests...');
    await this.runJest(this.testTypes.e2e, 'End-to-End Tests');
  }

  async runPerformanceTests() {
    console.log('⚡ Running Performance Tests...');
    console.log('   Testing M-Pesa API response times, database performance, and concurrent operations\n');

    try {
      await this.runJest(this.testTypes.performance, 'Performance Tests', [
        '--testTimeout=30000',
        '--maxWorkers=1' // Run performance tests sequentially
      ]);
    } catch (error) {
      console.log('⚠️  Performance tests failed. This may indicate performance issues.');
      throw error;
    }
  }

  async runSecurityTests() {
    console.log('🔒 Running Security Tests...');
    console.log('   Testing input validation, authentication, authorization, and callback security\n');

    try {
      await this.runJest(this.testTypes.security, 'Security Tests', [
        '--testTimeout=15000'
      ]);
    } catch (error) {
      console.log('🚨 Security tests failed. This indicates potential security vulnerabilities.');
      throw error;
    }
  }

  async runSandboxTests() {
    console.log('🏖️  Running M-Pesa Sandbox Tests...');
    console.log('⚠️  Note: This requires valid M-Pesa sandbox credentials\n');

    try {
      await this.runCommand('node', ['tests/sandbox/mpesaSandboxTest.js'], 'M-Pesa Sandbox Tests');
    } catch (error) {
      console.log('❌ Sandbox tests failed. This is expected if M-Pesa credentials are not configured.');
      console.log('   Configure your .env.test file with valid M-Pesa sandbox credentials to run these tests.\n');
    }
  }

  async runCITests() {
    console.log('🔄 Running CI/CD Pipeline Tests...');
    console.log('   Running core tests suitable for continuous integration\n');

    try {
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runSecurityTests();

      console.log('✅ CI test suite completed successfully!');
    } catch (error) {
      console.error('❌ CI test suite failed:', error.message);
      throw error;
    }
  }

  async runAllTests() {
    console.log('🚀 Running All Tests (except sandbox)...\n');

    try {
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runE2ETests();
      await this.runPerformanceTests();
      await this.runSecurityTests();

      console.log('🎉 All test suites completed successfully!');
      console.log('\n💡 To run M-Pesa sandbox tests, use: npm run test:sandbox');
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      throw error;
    }
  }

  async runWithCoverage() {
    console.log('📊 Running All Tests with Coverage Report...\n');

    const jestArgs = [
      '--coverage',
      '--coverageDirectory=coverage',
      '--coverageReporters=text,lcov,html',
      '--testPathPattern=(unit|integration|e2e)',
      '--verbose'
    ];

    await this.runJest('tests/**/*.test.js', 'All Tests with Coverage', jestArgs);
    
    console.log('\n📈 Coverage report generated in ./coverage directory');
    console.log('   Open ./coverage/lcov-report/index.html in your browser to view detailed coverage');
  }

  async runJest(testPattern, testName, additionalArgs = []) {
    const args = [
      '--testPathPattern=' + testPattern,
      '--verbose',
      '--detectOpenHandles',
      '--forceExit',
      ...additionalArgs
    ];

    await this.runCommand('npx', ['jest', ...args], testName);
  }

  async runCommand(command, args, testName) {
    return new Promise((resolve, reject) => {
      console.log(`Running: ${command} ${args.join(' ')}\n`);

      const suiteStartTime = Date.now();

      const process = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        cwd: path.join(__dirname, '..')
      });

      process.on('close', (code) => {
        const duration = Date.now() - suiteStartTime;

        if (code === 0) {
          console.log(`\n✅ ${testName} completed successfully (${duration}ms)\n`);
          this.testResults.suites.push({
            name: testName,
            status: 'passed',
            duration: duration
          });
          resolve();
        } else {
          console.log(`\n❌ ${testName} failed with exit code ${code} (${duration}ms)\n`);
          this.testResults.suites.push({
            name: testName,
            status: 'failed',
            duration: duration,
            exitCode: code
          });
          reject(new Error(`${testName} failed`));
        }
      });

      process.on('error', (error) => {
        console.error(`\n❌ Failed to start ${testName}:`, error.message);
        this.testResults.suites.push({
          name: testName,
          status: 'error',
          error: error.message
        });
        reject(error);
      });
    });
  }

  async generateTestReport(error = null) {
    this.testResults.duration = Date.now() - this.startTime;

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));

    console.log(`⏱️  Total Duration: ${this.testResults.duration}ms`);
    console.log(`📦 Test Suites: ${this.testResults.suites.length}`);

    // Display suite results
    this.testResults.suites.forEach(suite => {
      const icon = suite.status === 'passed' ? '✅' :
                   suite.status === 'failed' ? '❌' : '⚠️';
      console.log(`   ${icon} ${suite.name} (${suite.duration || 0}ms)`);
      if (suite.error) {
        console.log(`      Error: ${suite.error}`);
      }
    });

    const passedSuites = this.testResults.suites.filter(s => s.status === 'passed').length;
    const failedSuites = this.testResults.suites.filter(s => s.status === 'failed').length;

    console.log(`\n📈 Results: ${passedSuites} passed, ${failedSuites} failed`);

    if (error) {
      console.log(`\n🚨 Execution Error: ${error.message}`);
    }

    // Save report to file
    await this.saveTestReport();

    console.log('='.repeat(60));
  }

  async saveTestReport() {
    const reportPath = path.join(__dirname, '..', 'tests', 'logs', 'test-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.testResults.duration,
      suites: this.testResults.suites,
      summary: {
        total: this.testResults.suites.length,
        passed: this.testResults.suites.filter(s => s.status === 'passed').length,
        failed: this.testResults.suites.filter(s => s.status === 'failed').length,
        errors: this.testResults.suites.filter(s => s.status === 'error').length
      }
    };

    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Test report saved to: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️  Could not save test report: ${error.message}`);
    }
  }

  printUsage() {
    console.log('Usage: npm run test [type]');
    console.log('\nTest types:');
    console.log('  unit        - Run unit tests only');
    console.log('  integration - Run integration tests only');
    console.log('  e2e         - Run end-to-end tests only');
    console.log('  performance - Run performance tests only');
    console.log('  security    - Run security tests only');
    console.log('  sandbox     - Run M-Pesa sandbox tests (requires credentials)');
    console.log('  coverage    - Run all tests with coverage report');
    console.log('  ci          - Run CI/CD pipeline tests');
    console.log('  all         - Run all tests except sandbox (default)');
    console.log('\nExamples:');
    console.log('  npm run test unit');
    console.log('  npm run test:coverage');
    console.log('  npm run test:sandbox');
    console.log('  npm run test:performance');
    console.log('  npm run test:security');
  }
}

// Parse command line arguments
const testType = process.argv[2] || 'all';

if (testType === 'help' || testType === '--help' || testType === '-h') {
  const runner = new TestRunner();
  runner.printUsage();
  process.exit(0);
}

// Run tests
const runner = new TestRunner();
runner.run(testType).catch(error => {
  console.error('Test runner failed:', error.message);
  process.exit(1);
});
