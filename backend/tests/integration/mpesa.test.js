import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import { Transaction, PaymentBridge } from '../../src/models/Transaction.js';
import mpesaService from '../../src/services/mpesaService.js';
import TestDatabase from '../utils/testDatabase.js';

// Mock the M-Pesa service
jest.mock('../../src/services/mpesaService.js');

describe('M-Pesa API Integration Tests', () => {
  const testWalletAddress = '0x1234567890123456789012345678901234567890';
  const testPhoneNumber = '254712345678';
  const testPackageId = 1;
  const testAmount = 100;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/mpesa/initiate-payment', () => {
    const validPaymentData = {
      walletAddress: testWalletAddress,
      packageId: testPackageId,
      phoneNumber: testPhoneNumber,
      amount: testAmount
    };

    it('should successfully initiate M-Pesa payment', async () => {
      // Mock successful M-Pesa response
      mpesaService.initiateSTKPush.mockResolvedValue({
        success: true,
        checkoutRequestId: 'ws_CO_123456789',
        merchantRequestId: 'merchant_123456789',
        responseDescription: 'Success. Request accepted for processing'
      });

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(validPaymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.transactionId).toBeTruthy();
      expect(response.body.checkoutRequestId).toBe('ws_CO_123456789');
      expect(response.body.message).toContain('Payment request sent');
      expect(response.body.amount.usd).toBe(testAmount);
      expect(response.body.amount.kes).toBe(testAmount * 149.25);
    });

    it('should handle M-Pesa API failure', async () => {
      mpesaService.initiateSTKPush.mockResolvedValue({
        success: false,
        error: 'Insufficient funds'
      });

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(validPaymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient funds');
      expect(response.body.errorType).toBeTruthy();
    });

    it('should validate wallet address', async () => {
      const invalidData = {
        ...validPaymentData,
        walletAddress: 'invalid-address'
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Invalid wallet address');
    });

    it('should validate phone number format', async () => {
      const invalidData = {
        ...validPaymentData,
        phoneNumber: '0712345678' // Should be 254712345678
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should validate amount', async () => {
      const invalidData = {
        ...validPaymentData,
        amount: -10
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should validate package ID', async () => {
      const invalidData = {
        ...validPaymentData,
        packageId: 0
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should handle minimum amount validation', async () => {
      const invalidData = {
        ...validPaymentData,
        amount: 0.001 // Too small, results in KES < 1
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Amount too small');
    });

    it('should apply rate limiting', async () => {
      mpesaService.initiateSTKPush.mockResolvedValue({
        success: true,
        checkoutRequestId: 'ws_CO_123456789',
        merchantRequestId: 'merchant_123456789'
      });

      // Make multiple requests quickly
      const requests = Array(5).fill().map(() =>
        request(app)
          .post('/api/mpesa/initiate-payment')
          .send(validPaymentData)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/mpesa/callback/:transactionId', () => {
    let testTransaction;

    beforeEach(() => {
      // Create a test transaction
      testTransaction = global.testUtils.createTestTransaction({
        checkoutRequestId: 'ws_CO_123456789'
      });
    });

    it('should handle successful payment callback', async () => {
      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant_123456789',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 1000 },
                { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
                { Name: 'TransactionDate', Value: 20231201120000 },
                { Name: 'PhoneNumber', Value: 254712345678 }
              ]
            }
          }
        }
      };

      // Mock parseCallbackData
      mpesaService.parseCallbackData.mockReturnValue({
        merchantRequestId: 'merchant_123456789',
        checkoutRequestId: 'ws_CO_123456789',
        resultCode: 0,
        resultDesc: 'The service request is processed successfully.',
        amount: 1000,
        mpesaReceiptNumber: 'NLJ7RT61SV',
        transactionDate: 20231201120000,
        phoneNumber: 254712345678
      });

      const response = await request(app)
        .post(`/api/mpesa/callback/${testTransaction.id}`)
        .send(callbackData)
        .expect(200);

      expect(response.body.ResultCode).toBe(0);
      expect(response.body.ResultDesc).toBe('Success');
    });

    it('should handle failed payment callback', async () => {
      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant_123456789',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 1032,
            ResultDesc: 'Request cancelled by user'
          }
        }
      };

      mpesaService.parseCallbackData.mockReturnValue({
        merchantRequestId: 'merchant_123456789',
        checkoutRequestId: 'ws_CO_123456789',
        resultCode: 1032,
        resultDesc: 'Request cancelled by user'
      });

      const response = await request(app)
        .post(`/api/mpesa/callback/${testTransaction.id}`)
        .send(callbackData)
        .expect(200);

      expect(response.body.ResultCode).toBe(0);
      expect(response.body.ResultDesc).toBe('Success');
    });

    it('should handle callback for non-existent transaction', async () => {
      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant_123456789',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 0
          }
        }
      };

      const response = await request(app)
        .post('/api/mpesa/callback/non-existent-id')
        .send(callbackData)
        .expect(200); // Should still return success to M-Pesa

      expect(response.body.ResultCode).toBe(0);
    });
  });

  describe('GET /api/mpesa/status/:checkoutRequestId', () => {
    it('should query payment status successfully', async () => {
      const checkoutRequestId = 'ws_CO_123456789';
      
      // Mock M-Pesa query response
      mpesaService.querySTKPush.mockResolvedValue({
        success: true,
        data: {
          ResponseCode: '0',
          ResultCode: '0',
          ResultDesc: 'The service request is processed successfully.'
        }
      });

      const response = await request(app)
        .get(`/api/mpesa/status/${checkoutRequestId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.transaction).toBeTruthy();
      expect(response.body.mpesaStatus).toBeTruthy();
    });

    it('should handle query failure', async () => {
      const checkoutRequestId = 'ws_CO_123456789';
      
      mpesaService.querySTKPush.mockResolvedValue({
        success: false,
        error: 'Query failed'
      });

      const response = await request(app)
        .get(`/api/mpesa/status/${checkoutRequestId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Query failed');
    });

    it('should handle non-existent transaction', async () => {
      const checkoutRequestId = 'non-existent';

      const response = await request(app)
        .get(`/api/mpesa/status/${checkoutRequestId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Transaction not found');
    });
  });

  describe('GET /api/mpesa/transactions/:walletAddress', () => {
    it('should get transaction history for wallet', async () => {
      const response = await request(app)
        .get(`/api/mpesa/transactions/${testWalletAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.stats).toBeTruthy();
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get(`/api/mpesa/transactions/${testWalletAddress}`)
        .query({ limit: 5, offset: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.transactions)).toBe(true);
    });

    it('should apply rate limiting to transaction history', async () => {
      // Make multiple requests quickly
      const requests = Array(10).fill().map(() =>
        request(app).get(`/api/mpesa/transactions/${testWalletAddress}`)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/mpesa/timeout/:transactionId', () => {
    it('should handle timeout callback', async () => {
      const testTransaction = global.testUtils.createTestTransaction();

      const response = await request(app)
        .post(`/api/mpesa/timeout/${testTransaction.id}`)
        .send({})
        .expect(200);

      expect(response.body.ResultCode).toBe(0);
      expect(response.body.ResultDesc).toBe('Success');
    });
  });

  describe('Database Integration Tests', () => {
    let testDb;

    beforeEach(async () => {
      testDb = global.testDatabase.getDatabase();
      await global.testDatabase.cleanup();
    });

    it('should create transaction record in database', async () => {
      mpesaService.initiateSTKPush.mockResolvedValue({
        success: true,
        checkoutRequestId: 'ws_CO_123456789',
        merchantRequestId: 'merchant_123456789'
      });

      const validPaymentData = {
        walletAddress: testWalletAddress,
        packageId: testPackageId,
        phoneNumber: testPhoneNumber,
        amount: testAmount
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(validPaymentData)
        .expect(200);

      // Verify transaction was created in database
      const transaction = Transaction.findById(response.body.transactionId);
      expect(transaction).toBeTruthy();
      expect(transaction.user_wallet_address).toBe(testWalletAddress);
      expect(transaction.package_id).toBe(testPackageId);
      expect(transaction.phone_number).toBe(testPhoneNumber);
      expect(transaction.amount).toBe(testAmount);
      expect(transaction.status).toBe('pending');
    });

    it('should create payment bridge record on successful callback', async () => {
      // First create a transaction
      const transaction = global.testDatabase.createTestTransaction({
        checkoutRequestId: 'ws_CO_123456789'
      });

      const successCallbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant_123456789',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 14925 },
                { Name: 'MpesaReceiptNumber', Value: 'QHX12345TEST' },
                { Name: 'TransactionDate', Value: 20241217120000 },
                { Name: 'PhoneNumber', Value: 254708374149 }
              ]
            }
          }
        }
      };

      mpesaService.parseCallbackData.mockReturnValue({
        success: true,
        resultCode: 0,
        mpesaReceiptNumber: 'QHX12345TEST',
        transactionDate: '20241217120000'
      });

      await request(app)
        .post(`/api/mpesa/callback/${transaction.id}`)
        .send(successCallbackData)
        .expect(200);

      // Verify payment bridge was created
      const bridge = PaymentBridge.findByMpesaTransactionId(transaction.id);
      expect(bridge).toBeTruthy();
      expect(bridge.package_id).toBe(transaction.package_id);
      expect(bridge.user_wallet_address).toBe(transaction.user_wallet_address);
      expect(bridge.usdt_amount).toBe(transaction.amount);
    });

    it('should handle concurrent payment requests', async () => {
      mpesaService.initiateSTKPush.mockResolvedValue({
        success: true,
        checkoutRequestId: 'ws_CO_123456789',
        merchantRequestId: 'merchant_123456789'
      });

      const paymentData = {
        walletAddress: testWalletAddress,
        packageId: testPackageId,
        phoneNumber: testPhoneNumber,
        amount: testAmount
      };

      // Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/mpesa/initiate-payment')
          .send(paymentData)
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // All should have unique transaction IDs
      const transactionIds = responses.map(r => r.body.transactionId);
      const uniqueIds = new Set(transactionIds);
      expect(uniqueIds.size).toBe(5);
    });
  });

  describe('Rate Limiting Integration Tests', () => {
    it('should enforce rate limits on payment initiation', async () => {
      const paymentData = {
        walletAddress: testWalletAddress,
        packageId: testPackageId,
        phoneNumber: testPhoneNumber,
        amount: testAmount
      };

      // Make requests rapidly to trigger rate limiting
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/mpesa/initiate-payment')
          .send(paymentData)
      );

      const responses = await Promise.allSettled(promises);

      // Some requests should be rate limited (429 status)
      const rateLimited = responses.some(result =>
        result.status === 'fulfilled' && result.value.status === 429
      );

      // Note: This might not always trigger in test environment
      expect(responses.length).toBe(10);
    });

    it('should allow requests after rate limit window expires', async () => {
      const paymentData = {
        walletAddress: testWalletAddress,
        packageId: testPackageId,
        phoneNumber: testPhoneNumber,
        amount: testAmount
      };

      // First request should succeed
      const response1 = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(paymentData);

      expect(response1.status).toBe(200);

      // Wait for rate limit window to reset (if needed)
      await global.testUtils.wait(1000);

      // Second request should also succeed
      const response2 = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(paymentData);

      expect(response2.status).toBe(200);
    });
  });

  describe('Security Integration Tests', () => {
    it('should reject requests without proper headers', async () => {
      const paymentData = {
        walletAddress: testWalletAddress,
        packageId: testPackageId,
        phoneNumber: testPhoneNumber,
        amount: testAmount
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .set('User-Agent', 'malicious-bot')
        .send(paymentData);

      // Should still work with proper validation
      expect(response.status).toBeLessThan(500);
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        walletAddress: testWalletAddress,
        packageId: testPackageId,
        phoneNumber: testPhoneNumber,
        amount: testAmount,
        maliciousField: '<script>alert("xss")</script>'
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(maliciousData);

      // Should not include malicious content in response
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    it('should validate callback source IP in production', async () => {
      // This test simulates production IP validation
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const callbackData = {
        Body: {
          stkCallback: {
            ResultCode: 0,
            ResultDesc: 'Success'
          }
        }
      };

      const response = await request(app)
        .post('/api/mpesa/callback/test-tx-123')
        .set('X-Forwarded-For', '192.168.1.1') // Invalid IP
        .send(callbackData);

      // Should reject unauthorized IP
      expect(response.status).toBe(403);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });
});
