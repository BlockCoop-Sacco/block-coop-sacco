// Test setup file
import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_PATH = ':memory:';

// Mock environment variables for testing
process.env.MPESA_CONSUMER_KEY = 'test_consumer_key';
process.env.MPESA_CONSUMER_SECRET = 'test_consumer_secret';
process.env.MPESA_BUSINESS_SHORT_CODE = '174379';
process.env.MPESA_PASSKEY = 'test_passkey';
process.env.MPESA_BASE_URL = 'https://sandbox.safaricom.co.ke';
process.env.BSC_RPC_URL = 'https://bsc-testnet.public.blastapi.io';
process.env.PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
process.env.USDT_ADDRESS = '0x52f8BE86c4157eF5F11f3d73135ec4a568B02b90';
process.env.PACKAGE_MANAGER_ADDRESS = '0xF7075036dBd8d393B4DcF63071C3eF4abD8f31b9';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_purposes_only';
process.env.API_KEY = 'test_api_key_for_testing';

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests unless LOG_LEVEL is debug
if (process.env.LOG_LEVEL !== 'debug') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

// Global test utilities
global.testUtils = {
  // Generate valid test wallet address
  generateWalletAddress: () => '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df31',
  
  // Generate valid test phone number
  generatePhoneNumber: () => '254712345678',
  
  // Generate valid payment data
  generatePaymentData: (overrides = {}) => ({
    walletAddress: global.testUtils.generateWalletAddress(),
    packageId: 1,
    phoneNumber: global.testUtils.generatePhoneNumber(),
    amount: 100,
    ...overrides
  }),
  
  // Wait for a specified time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Clean up after all tests
afterAll(async () => {
  // Close any open database connections
  // Close any open HTTP connections
  // Clean up any temporary files
});
