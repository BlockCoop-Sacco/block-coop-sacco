import '@testing-library/jest-dom'
import { expect, afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

// Setup MSW server for API mocking
export const server = setupServer(...handlers)

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Close server after all tests
afterAll(() => {
  server.close()
})

// Mock environment variables
Object.defineProperty(window, 'import', {
  value: {
    meta: {
      env: {
        VITE_MPESA_API_URL: 'http://localhost:3001/api',
        VITE_APP_ENV: 'test',
        MODE: 'test'
      }
    }
  }
})

// Mock Web3 provider
Object.defineProperty(window, 'ethereum', {
  value: {
    isMetaMask: true,
    request: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
  writable: true
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Global test utilities
global.testUtils = {
  // Wait for async operations
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock M-Pesa payment data
  createMockPaymentData: (overrides = {}) => ({
    walletAddress: '0x1234567890123456789012345678901234567890',
    packageId: 1,
    phoneNumber: '254708374149',
    amount: 100,
    referrerAddress: '0x2345678901234567890123456789012345678901',
    ...overrides
  }),
  
  // Mock M-Pesa response
  createMockMpesaResponse: (success = true, overrides = {}) => ({
    success,
    ...(success ? {
      transactionId: 'test-tx-123',
      checkoutRequestId: 'ws_CO_123456789',
      message: 'Payment request sent to your phone',
      amount: {
        usd: 100,
        kes: 14925
      }
    } : {
      error: 'Test error message'
    }),
    ...overrides
  }),
  
  // Mock transaction status
  createMockTransactionStatus: (status = 'completed', overrides = {}) => ({
    transactionId: 'test-tx-123',
    status,
    amount: {
      usd: 100,
      kes: 14925
    },
    phoneNumber: '254708374149',
    mpesaReceiptNumber: status === 'completed' ? 'QHX12345' : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }),
  
  // Mock Web3 provider
  createMockWeb3Provider: () => ({
    isConnected: true,
    address: '0x1234567890123456789012345678901234567890',
    chainId: 56,
    provider: {
      request: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    }
  }),
  
  // Mock package data
  createMockPackage: (overrides = {}) => ({
    id: 1,
    name: 'Starter Package',
    usdtAmount: 100,
    price: 100,
    description: 'Perfect for beginners',
    features: ['Feature 1', 'Feature 2'],
    isActive: true,
    ...overrides
  })
}

// Console suppression for cleaner test output
const originalConsole = { ...console }
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Restore console for debugging when needed
global.restoreConsole = () => {
  global.console = originalConsole
}

// Custom matchers
expect.extend({
  toBeValidPhoneNumber(received) {
    const phoneRegex = /^254[0-9]{9}$/
    const pass = phoneRegex.test(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Kenyan phone number`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid Kenyan phone number (254XXXXXXXXX)`,
        pass: false,
      }
    }
  },
  
  toBeValidWalletAddress(received) {
    const addressRegex = /^0x[a-fA-F0-9]{40}$/
    const pass = addressRegex.test(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid wallet address`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid wallet address (0x followed by 40 hex characters)`,
        pass: false,
      }
    }
  }
})
