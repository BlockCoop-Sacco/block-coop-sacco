import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { initializeDatabase, closeDatabase } from '../src/database/init.js';
import mpesaRoutes from '../src/routes/mpesa.js';
import healthRoutes from '../src/routes/health.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

// Create test app
const createTestApp = () => {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  
  // Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/mpesa', mpesaRoutes);
  
  // Error handling
  app.use(errorHandler);
  
  return app;
};

describe('Backend Basic Functionality', () => {
  let app;

  beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_PATH = ':memory:'; // Use in-memory SQLite for tests
    process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
    
    // Initialize test database
    await initializeDatabase();
    
    // Create test app
    app = createTestApp();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Health Endpoints', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('services');
    });

    it('should return detailed health status', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
    });

    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/api/health/ready');

      expect(response.body).toHaveProperty('ready');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/api/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('alive', true);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('M-Pesa Endpoints', () => {
    it('should return M-Pesa service health', async () => {
      const response = await request(app)
        .get('/api/mpesa/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('service', 'M-Pesa Integration');
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should validate payment initiation request', async () => {
      const invalidPaymentData = {
        walletAddress: 'invalid-address',
        packageId: 'invalid',
        phoneNumber: 'invalid-phone',
        amount: -1
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(invalidPaymentData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('errorType', 'VALIDATION_ERROR');
    });

    it('should validate wallet address format', async () => {
      const invalidWalletData = {
        walletAddress: 'not-a-valid-address',
        packageId: 1,
        phoneNumber: '254712345678',
        amount: 100
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(invalidWalletData)
        .expect(400);

      expect(response.body.errorType).toBe('VALIDATION_ERROR');
    });

    it('should validate phone number format', async () => {
      const invalidPhoneData = {
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df31',
        packageId: 1,
        phoneNumber: '123456789', // Invalid format
        amount: 100
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(invalidPhoneData)
        .expect(400);

      expect(response.body.errorType).toBe('VALIDATION_ERROR');
    });

    it('should validate package ID', async () => {
      const invalidPackageData = {
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df31',
        packageId: 0, // Invalid package ID
        phoneNumber: '254712345678',
        amount: 100
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(invalidPackageData)
        .expect(400);

      expect(response.body.errorType).toBe('VALIDATION_ERROR');
    });

    it('should validate amount', async () => {
      const invalidAmountData = {
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df31',
        packageId: 1,
        phoneNumber: '254712345678',
        amount: 0 // Invalid amount
      };

      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send(invalidAmountData)
        .expect(400);

      expect(response.body.errorType).toBe('VALIDATION_ERROR');
    });

    it('should return recovery stats', async () => {
      const response = await request(app)
        .get('/api/mpesa/recovery-stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('statusBreakdown');
      expect(response.body.stats).toHaveProperty('pendingRecovery');
      expect(response.body.stats).toHaveProperty('failedPermanently');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/mpesa/initiate-payment')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to payment endpoints', async () => {
      const validPaymentData = {
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df31',
        packageId: 1,
        phoneNumber: '254712345678',
        amount: 100
      };

      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(5).fill().map(() => 
        request(app)
          .post('/api/mpesa/initiate-payment')
          .send(validPaymentData)
      );

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
