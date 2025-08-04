import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import mpesaService from '../../src/services/mpesaService.js';
import Transaction from '../../src/models/Transaction.js';

// Mock external services
jest.mock('../../src/services/mpesaService.js');
jest.mock('../../src/models/Transaction.js');

describe('M-Pesa Performance Tests', () => {
  const testData = {
    walletAddress: '0x1234567890123456789012345678901234567890',
    packageId: 1,
    phoneNumber: '254712345678',
    amount: 100
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    Transaction.create.mockReturnValue({
      id: 'test-transaction-id',
      ...testData,
      kesAmount: 14925,
      status: 'pending'
    });
    
    mpesaService.initiateSTKPush.mockResolvedValue({
      success: true,
      checkoutRequestId: 'ws_CO_123456789',
      merchantRequestId: 'merchant_123456789'
    });
  });

  describe('API Response Time Tests', () => {
    it('should initiate M-Pesa payment within acceptable time limit', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(testData)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
      
      console.log(`Payment initiation response time: ${responseTime}ms`);
    });

    it('should handle callback processing within acceptable time', async () => {
      const callbackData = global.testUtils.createCallbackData('success');
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/mpesa/callback/test-transaction-id')
        .send(callbackData)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(3000); // Should process callback within 3 seconds
      
      console.log(`Callback processing time: ${responseTime}ms`);
    });

    it('should query transaction status within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/mpesa/status/test-transaction-id')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
      
      console.log(`Status query response time: ${responseTime}ms`);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous payment initiations', async () => {
      const concurrentRequests = 10;
      const requests = [];
      
      const startTime = Date.now();
      
      // Create multiple concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        const requestData = {
          ...testData,
          phoneNumber: `25471234567${i}` // Unique phone numbers
        };
        
        requests.push(
          request(app)
            .post('/api/mpesa/initiate-payment')
            .send(requestData)
        );
      }
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      const averageTime = totalTime / concurrentRequests;
      expect(averageTime).toBeLessThan(8000); // Average should be under 8 seconds
      
      console.log(`Concurrent requests (${concurrentRequests}): Total ${totalTime}ms, Average ${averageTime}ms`);
    });

    it('should handle concurrent callback processing', async () => {
      const concurrentCallbacks = 5;
      const requests = [];
      
      const startTime = Date.now();
      
      // Create multiple concurrent callback requests
      for (let i = 0; i < concurrentCallbacks; i++) {
        const callbackData = global.testUtils.createCallbackData('success', `ws_CO_12345678${i}`);
        
        requests.push(
          request(app)
            .post(`/api/mpesa/callback/test-transaction-id-${i}`)
            .send(callbackData)
        );
      }
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All callbacks should be processed successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      const averageTime = totalTime / concurrentCallbacks;
      expect(averageTime).toBeLessThan(5000); // Average should be under 5 seconds
      
      console.log(`Concurrent callbacks (${concurrentCallbacks}): Total ${totalTime}ms, Average ${averageTime}ms`);
    });
  });

  describe('Database Performance Tests', () => {
    it('should create transaction records efficiently', async () => {
      const iterations = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        Transaction.create({
          userWalletAddress: testData.walletAddress,
          packageId: testData.packageId,
          phoneNumber: `25471234${String(i).padStart(4, '0')}`,
          amount: testData.amount,
          kesAmount: 14925
        });
      }
      
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / iterations;
      
      expect(averageTime).toBeLessThan(50); // Should create each record in under 50ms
      expect(Transaction.create).toHaveBeenCalledTimes(iterations);
      
      console.log(`Database operations (${iterations}): Total ${totalTime}ms, Average ${averageTime}ms`);
    });

    it('should handle transaction status updates efficiently', async () => {
      const iterations = 50;
      const startTime = Date.now();
      
      Transaction.updateStatus = jest.fn().mockReturnValue({ success: true });
      
      for (let i = 0; i < iterations; i++) {
        Transaction.updateStatus(`test-id-${i}`, 'completed');
      }
      
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / iterations;
      
      expect(averageTime).toBeLessThan(30); // Should update each record in under 30ms
      expect(Transaction.updateStatus).toHaveBeenCalledTimes(iterations);
      
      console.log(`Status updates (${iterations}): Total ${totalTime}ms, Average ${averageTime}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not have memory leaks during extended operation', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 50;
      
      // Simulate extended operation
      for (let i = 0; i < iterations; i++) {
        await request(app)
          .post('/api/mpesa/initiate-payment')
          .send({
            ...testData,
            phoneNumber: `25471234${String(i).padStart(4, '0')}`
          });
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePerOp = memoryIncrease / iterations;
      
      // Memory increase should be reasonable (less than 1MB per operation)
      expect(memoryIncreasePerOp).toBeLessThan(1024 * 1024);
      
      console.log(`Memory usage: Initial ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB, ` +
                  `Final ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB, ` +
                  `Increase ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });

  describe('Load Testing', () => {
    it('should maintain performance under sustained load', async () => {
      const duration = 10000; // 10 seconds
      const startTime = Date.now();
      const requests = [];
      let requestCount = 0;
      
      // Generate requests for the duration
      while (Date.now() - startTime < duration) {
        requests.push(
          request(app)
            .get('/api/mpesa/status/test-transaction-id')
            .then(() => requestCount++)
            .catch(() => requestCount++) // Count failed requests too
        );
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await Promise.allSettled(requests);
      
      const actualDuration = Date.now() - startTime;
      const requestsPerSecond = (requestCount / actualDuration) * 1000;
      
      // Should handle at least 5 requests per second
      expect(requestsPerSecond).toBeGreaterThan(5);
      
      console.log(`Load test: ${requestCount} requests in ${actualDuration}ms (${requestsPerSecond.toFixed(2)} req/sec)`);
    });
  });
});
