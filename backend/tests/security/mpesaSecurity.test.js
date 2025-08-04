import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import mpesaService from '../../src/services/mpesaService.js';
import Transaction from '../../src/models/Transaction.js';

// Mock external services
jest.mock('../../src/services/mpesaService.js');
jest.mock('../../src/models/Transaction.js');

describe('M-Pesa Security Tests', () => {
  const validPaymentData = {
    walletAddress: '0x1234567890123456789012345678901234567890',
    packageId: 1,
    phoneNumber: '254712345678',
    amount: 100
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    Transaction.create.mockReturnValue({
      id: 'test-transaction-id',
      ...validPaymentData,
      kesAmount: 14925,
      status: 'pending'
    });
    
    mpesaService.initiateSTKPush.mockResolvedValue({
      success: true,
      checkoutRequestId: 'ws_CO_123456789',
      merchantRequestId: 'merchant_123456789'
    });
  });

  describe('Input Validation Security', () => {
    it('should reject SQL injection attempts in wallet address', async () => {
      const maliciousData = {
        ...validPaymentData,
        walletAddress: "'; DROP TABLE transactions; --"
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(maliciousData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid wallet address');
    });

    it('should reject XSS attempts in phone number', async () => {
      const maliciousData = {
        ...validPaymentData,
        phoneNumber: '<script>alert("xss")</script>'
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(maliciousData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid phone number');
    });

    it('should reject extremely large amounts', async () => {
      const maliciousData = {
        ...validPaymentData,
        amount: Number.MAX_SAFE_INTEGER
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(maliciousData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Amount exceeds maximum limit');
    });

    it('should reject negative amounts', async () => {
      const maliciousData = {
        ...validPaymentData,
        amount: -100
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(maliciousData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Amount must be positive');
    });

    it('should reject invalid package IDs', async () => {
      const maliciousData = {
        ...validPaymentData,
        packageId: 'invalid_package_id'
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(maliciousData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid package ID');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require valid API key for sensitive operations', async () => {
      const response = await request(app)
        .post('/api/mpesa/admin/refund')
        .send({ transactionId: 'test-id' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should validate API key format', async () => {
      const response = await request(app)
        .post('/api/mpesa/admin/refund')
        .set('Authorization', 'Bearer invalid_key_format')
        .send({ transactionId: 'test-id' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should prevent unauthorized access to transaction details', async () => {
      const response = await request(app)
        .get('/api/mpesa/admin/transactions')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Callback Security', () => {
    it('should validate M-Pesa callback signature', async () => {
      const invalidCallbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant_123456789',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 0
          }
        }
      };

      // Mock signature validation failure
      mpesaService.validateCallbackSignature = jest.fn().mockReturnValue(false);

      const response = await request(app)
        .post('/api/mpesa/callback/test-transaction-id')
        .send(invalidCallbackData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid callback signature');
    });

    it('should reject callbacks with missing required fields', async () => {
      const incompleteCallbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant_123456789'
            // Missing CheckoutRequestID and ResultCode
          }
        }
      };

      const response = await request(app)
        .post('/api/mpesa/callback/test-transaction-id')
        .send(incompleteCallbackData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid callback data');
    });

    it('should prevent callback replay attacks', async () => {
      const callbackData = global.testUtils.createCallbackData('success');
      
      // First callback should succeed
      await request(app)
        .post('/api/mpesa/callback/test-transaction-id')
        .send(callbackData)
        .expect(200);

      // Second identical callback should be rejected
      const response = await request(app)
        .post('/api/mpesa/callback/test-transaction-id')
        .send(callbackData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Callback already processed');
    });

    it('should validate callback timestamp to prevent old callbacks', async () => {
      const oldCallbackData = {
        ...global.testUtils.createCallbackData('success'),
        timestamp: Date.now() - (24 * 60 * 60 * 1000) // 24 hours old
      };

      const response = await request(app)
        .post('/api/mpesa/callback/test-transaction-id')
        .send(oldCallbackData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Callback timestamp too old');
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits on payment initiation', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post('/api/mpesa/initiate-payment')
            .send({
              ...validPaymentData,
              phoneNumber: `25471234567${i}`
            })
        );
      }

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        result => result.value && result.value.status === 429
      );
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits per IP address', async () => {
      const requests = [];
      
      // Make multiple requests from same IP
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .post('/api/mpesa/initiate-payment')
            .set('X-Forwarded-For', '192.168.1.100')
            .send(validPaymentData)
        );
      }

      const responses = await Promise.allSettled(requests);
      
      // Later requests should be rate limited
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.value.status).toBe(429);
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize phone numbers', async () => {
      const dataWithSpaces = {
        ...validPaymentData,
        phoneNumber: ' 254 712 345 678 '
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(dataWithSpaces)
        .expect(200);

      expect(mpesaService.initiateSTKPush).toHaveBeenCalledWith(
        '254712345678', // Should be sanitized
        expect.any(Number),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should sanitize wallet addresses', async () => {
      const dataWithMixedCase = {
        ...validPaymentData,
        walletAddress: '0X1234567890123456789012345678901234567890'
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(dataWithMixedCase)
        .expect(200);

      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userWalletAddress: '0x1234567890123456789012345678901234567890' // Should be lowercase
        })
      );
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose sensitive information in error messages', async () => {
      // Mock database error
      Transaction.create.mockImplementation(() => {
        throw new Error('Database connection failed: password=secret123');
      });

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(validPaymentData)
        .expect(500);

      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('secret');
      expect(response.body.error).toContain('Internal server error');
    });

    it('should not expose stack traces in production', async () => {
      // Temporarily set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      Transaction.create.mockImplementation(() => {
        throw new Error('Test error');
      });

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(validPaymentData)
        .expect(500);

      expect(response.body.stack).toBeUndefined();
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('CORS Security', () => {
    it('should enforce CORS policy', async () => {
      const response = await request(app)
        .options('/api/mpesa/initiate-payment')
        .set('Origin', 'https://malicious-site.com')
        .expect(200);

      // Should not allow arbitrary origins
      expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
    });

    it('should allow configured origins', async () => {
      const response = await request(app)
        .options('/api/mpesa/initiate-payment')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      // Should allow localhost for development
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Content Security', () => {
    it('should set security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should validate content type for POST requests', async () => {
      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400);

      expect(response.body.error).toContain('Invalid content type');
    });
  });
});
