import dotenv from 'dotenv';
import mpesaService from '../../src/services/mpesaService.js';
import logger from '../../src/config/logger.js';

// Load test environment
dotenv.config({ path: '.env.test' });

/**
 * M-Pesa Sandbox Integration Test
 * 
 * This script tests the actual M-Pesa sandbox API integration.
 * Run this manually to verify M-Pesa API connectivity and functionality.
 * 
 * Usage: node tests/sandbox/mpesaSandboxTest.js
 */

class MpesaSandboxTester {
  constructor() {
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🚀 Starting M-Pesa Sandbox Integration Tests...\n');

    try {
      await this.testAccessTokenGeneration();
      await this.testSTKPushInitiation();
      await this.testSTKPushQuery();
      await this.testCallbackDataParsing();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testAccessTokenGeneration() {
    console.log('📋 Testing Access Token Generation...');
    
    try {
      const token = await mpesaService.getAccessToken();
      
      if (token && typeof token === 'string' && token.length > 0) {
        this.addResult('Access Token Generation', true, 'Token generated successfully');
        console.log('✅ Access token generated successfully');
      } else {
        this.addResult('Access Token Generation', false, 'Invalid token received');
        console.log('❌ Invalid token received');
      }
    } catch (error) {
      this.addResult('Access Token Generation', false, error.message);
      console.log('❌ Access token generation failed:', error.message);
    }
    
    console.log('');
  }

  async testSTKPushInitiation() {
    console.log('📋 Testing STK Push Initiation...');
    
    try {
      // Use sandbox test phone number
      const testPhoneNumber = '254708374149'; // Safaricom sandbox test number
      const testAmount = 1; // Minimum amount for testing
      const testAccountRef = 'BlockCoop Test';
      const testDescription = 'Test USDT Package Purchase';
      const testCallbackUrl = 'https://mydomain.com/path';

      const result = await mpesaService.initiateSTKPush(
        testPhoneNumber,
        testAmount,
        testAccountRef,
        testDescription,
        testCallbackUrl
      );

      if (result.success) {
        this.addResult('STK Push Initiation', true, `CheckoutRequestID: ${result.checkoutRequestId}`);
        console.log('✅ STK Push initiated successfully');
        console.log(`   CheckoutRequestID: ${result.checkoutRequestId}`);
        console.log(`   MerchantRequestID: ${result.merchantRequestId}`);
        
        // Store for query test
        this.lastCheckoutRequestId = result.checkoutRequestId;
      } else {
        this.addResult('STK Push Initiation', false, result.error);
        console.log('❌ STK Push initiation failed:', result.error);
      }
    } catch (error) {
      this.addResult('STK Push Initiation', false, error.message);
      console.log('❌ STK Push initiation error:', error.message);
    }
    
    console.log('');
  }

  async testSTKPushQuery() {
    console.log('📋 Testing STK Push Query...');
    
    if (!this.lastCheckoutRequestId) {
      this.addResult('STK Push Query', false, 'No CheckoutRequestID available from previous test');
      console.log('❌ No CheckoutRequestID available from previous test');
      console.log('');
      return;
    }

    try {
      // Wait a moment before querying
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await mpesaService.querySTKPush(this.lastCheckoutRequestId);

      if (result.success) {
        this.addResult('STK Push Query', true, `ResultCode: ${result.data.ResultCode}`);
        console.log('✅ STK Push query successful');
        console.log(`   ResponseCode: ${result.data.ResponseCode}`);
        console.log(`   ResultCode: ${result.data.ResultCode}`);
        console.log(`   ResultDesc: ${result.data.ResultDesc}`);
      } else {
        this.addResult('STK Push Query', false, result.error);
        console.log('❌ STK Push query failed:', result.error);
      }
    } catch (error) {
      this.addResult('STK Push Query', false, error.message);
      console.log('❌ STK Push query error:', error.message);
    }
    
    console.log('');
  }

  async testCallbackDataParsing() {
    console.log('📋 Testing Callback Data Parsing...');
    
    try {
      // Test successful callback data
      const successCallbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'test-merchant-123',
            CheckoutRequestID: 'ws_CO_test123',
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 1 },
                { Name: 'MpesaReceiptNumber', Value: 'TEST123' },
                { Name: 'TransactionDate', Value: 20231201120000 },
                { Name: 'PhoneNumber', Value: 254708374149 }
              ]
            }
          }
        }
      };

      const successResult = mpesaService.parseCallbackData(successCallbackData);
      
      if (successResult.resultCode === 0 && successResult.mpesaReceiptNumber === 'TEST123') {
        this.addResult('Callback Parsing (Success)', true, 'Success callback parsed correctly');
        console.log('✅ Success callback data parsed correctly');
      } else {
        this.addResult('Callback Parsing (Success)', false, 'Success callback parsing failed');
        console.log('❌ Success callback parsing failed');
      }

      // Test failed callback data
      const failedCallbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'test-merchant-123',
            CheckoutRequestID: 'ws_CO_test123',
            ResultCode: 1032,
            ResultDesc: 'Request cancelled by user'
          }
        }
      };

      const failedResult = mpesaService.parseCallbackData(failedCallbackData);
      
      if (failedResult.resultCode === 1032 && failedResult.resultDesc === 'Request cancelled by user') {
        this.addResult('Callback Parsing (Failed)', true, 'Failed callback parsed correctly');
        console.log('✅ Failed callback data parsed correctly');
      } else {
        this.addResult('Callback Parsing (Failed)', false, 'Failed callback parsing failed');
        console.log('❌ Failed callback parsing failed');
      }

    } catch (error) {
      this.addResult('Callback Data Parsing', false, error.message);
      console.log('❌ Callback data parsing error:', error.message);
    }
    
    console.log('');
  }

  addResult(testName, success, message) {
    this.testResults.push({
      testName,
      success,
      message,
      timestamp: new Date().toISOString()
    });
  }

  printResults() {
    console.log('📊 Test Results Summary');
    console.log('========================\n');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    this.testResults.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.testName}`);
      console.log(`     ${result.message}`);
      console.log('');
    });

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n⚠️  Some tests failed. Check your M-Pesa configuration and network connectivity.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed! M-Pesa integration is working correctly.');
      process.exit(0);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MpesaSandboxTester();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export default MpesaSandboxTester;
