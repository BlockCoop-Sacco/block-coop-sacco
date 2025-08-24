import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import TestDatabase from './utils/testDatabase.js';
import MpesaMockService from './mocks/mpesaMockService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:'; // Use in-memory SQLite for tests

// Initialize test database and mock services
let testDatabase;
let mpesaMockService;

// Setup test database
beforeAll(async () => {
  testDatabase = new TestDatabase();
  await testDatabase.initialize();

  mpesaMockService = new MpesaMockService();

  // Make available globally
  global.testDatabase = testDatabase;
  global.mpesaMockService = mpesaMockService;
});

// Cleanup after all tests
afterAll(async () => {
  if (testDatabase) {
    await testDatabase.close();
  }
});

// Mock external services
global.mockMpesaApi = {
  generateAccessToken: jest.fn(),
  initiateSTKPush: jest.fn(),
  querySTKPush: jest.fn()
};

// Mock blockchain service
global.mockBlockchainService = {
  initialize: jest.fn(),
  getPackageDetails: jest.fn(),
  executePurchaseForUser: jest.fn(),
  getTreasuryUSDTBalance: jest.fn()
};

// Test utilities
global.testUtils = {
  // Create test transaction data
  createTestTransaction: (overrides = {}) => ({
    id: 'test-transaction-id',
    userWalletAddress: '0x1234567890123456789012345678901234567890',
    packageId: 1,
    phoneNumber: '254712345678',
    amount: 100,
    kesAmount: 14925,
    checkoutRequestId: 'ws_CO_123456789',
    merchantRequestId: 'merchant_123456789',
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  // Create test M-Pesa response
  createMpesaResponse: (success = true, overrides = {}) => ({
    success,
    ...(success ? {
      checkoutRequestId: 'ws_CO_123456789',
      merchantRequestId: 'merchant_123456789',
      responseDescription: 'Success. Request accepted for processing'
    } : {
      error: 'Test error message'
    }),
    ...overrides
  }),

  // Create test blockchain response
  createBlockchainResponse: (success = true, overrides = {}) => ({
    success,
    ...(success ? {
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      gasUsed: '21000',
      blockNumber: 12345
    } : {
      error: 'Blockchain error'
    }),
    ...overrides
  }),

  // Wait for async operations
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Clean up test database
  cleanupDatabase: async () => {
    if (global.testDatabase) {
      await global.testDatabase.cleanup();
    }
  },

  // Create test M-Pesa callback data
  createCallbackData: (scenario = 'success', checkoutRequestId = 'ws_CO_123456789', merchantRequestId = 'merchant_123456789') => {
    if (global.mpesaMockService) {
      return global.mpesaMockService.generateCallbackData(scenario, checkoutRequestId, merchantRequestId);
    }
    return null;
  },

  // Configure mock M-Pesa scenario
  configureMpesaScenario: (scenario, phoneNumber = null) => {
    if (global.mpesaMockService) {
      global.mpesaMockService.configureMockScenario(scenario, phoneNumber);
    }
  },

  // Reset M-Pesa mocks
  resetMpesaMocks: () => {
    if (global.mpesaMockService) {
      global.mpesaMockService.resetMocks();
    }
  }
};

// Global test hooks
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Clean up after each test
  await global.testUtils.cleanupDatabase();
});

// Suppress console logs during tests unless explicitly needed
if (!process.env.VERBOSE_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}
