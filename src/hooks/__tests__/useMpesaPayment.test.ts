import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMpesaPayment } from '../useMpesaPayment'
import { Web3Provider } from '../../providers/Web3Provider'
import React from 'react'

// Mock the Web3Provider
const mockWeb3Context = {
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  chainId: 56,
  provider: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  switchNetwork: vi.fn()
}

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Web3Provider value={mockWeb3Context}>
        {children}
      </Web3Provider>
    </QueryClientProvider>
  )
}

describe('useMpesaPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset any global state
    global.testUtils?.resetMpesaMocks?.()
  })

  describe('Initial State', () => {
    it('should return initial state correctly', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      expect(result.current.status).toBe('idle')
      expect(result.current.transactionId).toBeNull()
      expect(result.current.checkoutRequestId).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.amount).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  describe('initiatePayment', () => {
    it('should initiate payment successfully', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      const paymentData = global.testUtils.createMockPaymentData()

      await act(async () => {
        const success = await result.current.initiatePayment(paymentData)
        expect(success).toBe(true)
      })

      expect(result.current.status).toBe('pending')
      expect(result.current.transactionId).toBeTruthy()
      expect(result.current.checkoutRequestId).toBeTruthy()
      expect(result.current.amount).toEqual({
        usd: 100,
        kes: 14925
      })
      expect(result.current.loading).toBe(false)
    })

    it('should handle payment initiation failure', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      // Configure mock for failure scenario
      global.testUtils?.configureMpesaScenario?.('insufficient_funds', '254708374150')

      const paymentData = global.testUtils.createMockPaymentData({
        phoneNumber: '254708374150'
      })

      await act(async () => {
        const success = await result.current.initiatePayment(paymentData)
        expect(success).toBe(false)
      })

      expect(result.current.status).toBe('failed')
      expect(result.current.error).toBeTruthy()
      expect(result.current.transactionId).toBeNull()
    })

    it('should validate required fields', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      const invalidPaymentData = {
        walletAddress: '',
        packageId: 1,
        phoneNumber: '254708374149',
        amount: 100
      }

      await act(async () => {
        const success = await result.current.initiatePayment(invalidPaymentData)
        expect(success).toBe(false)
      })

      expect(result.current.status).toBe('failed')
      expect(result.current.error).toContain('wallet address')
    })

    it('should validate phone number format', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      const invalidPaymentData = global.testUtils.createMockPaymentData({
        phoneNumber: 'invalid-phone'
      })

      await act(async () => {
        const success = await result.current.initiatePayment(invalidPaymentData)
        expect(success).toBe(false)
      })

      expect(result.current.status).toBe('failed')
      expect(result.current.error).toContain('phone number')
    })

    it('should validate amount', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      const invalidPaymentData = global.testUtils.createMockPaymentData({
        amount: 0
      })

      await act(async () => {
        const success = await result.current.initiatePayment(invalidPaymentData)
        expect(success).toBe(false)
      })

      expect(result.current.status).toBe('failed')
      expect(result.current.error).toContain('amount')
    })
  })

  describe('checkTransactionStatus', () => {
    it('should check transaction status', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      const transactionId = 'tx_completed'

      await act(async () => {
        const status = await result.current.checkTransactionStatus(transactionId)
        expect(status).toBeTruthy()
      })

      expect(result.current.status).toBe('completed')
    })

    it('should handle failed transaction status', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      const transactionId = 'tx_failed'

      await act(async () => {
        const status = await result.current.checkTransactionStatus(transactionId)
        expect(status).toBeTruthy()
      })

      expect(result.current.status).toBe('failed')
      expect(result.current.error).toBeTruthy()
    })

    it('should handle pending transaction status', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      const transactionId = 'tx_pending'

      await act(async () => {
        const status = await result.current.checkTransactionStatus(transactionId)
        expect(status).toBeTruthy()
      })

      expect(result.current.status).toBe('pending')
    })
  })

  describe('resetPayment', () => {
    it('should reset payment state', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      // First initiate a payment
      const paymentData = global.testUtils.createMockPaymentData()

      await act(async () => {
        await result.current.initiatePayment(paymentData)
      })

      expect(result.current.status).toBe('pending')

      // Then reset
      act(() => {
        result.current.resetPayment()
      })

      expect(result.current.status).toBe('idle')
      expect(result.current.transactionId).toBeNull()
      expect(result.current.checkoutRequestId).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.amount).toBeNull()
    })
  })

  describe('Payment Status Polling', () => {
    it('should start polling after successful payment initiation', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      const paymentData = global.testUtils.createMockPaymentData()

      await act(async () => {
        await result.current.initiatePayment(paymentData)
      })

      expect(result.current.status).toBe('pending')

      // Wait for polling to complete the payment
      await waitFor(() => {
        expect(result.current.status).toBe('completed')
      }, { timeout: 10000 })
    })

    it('should stop polling when payment is completed', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      const paymentData = global.testUtils.createMockPaymentData()

      await act(async () => {
        await result.current.initiatePayment(paymentData)
      })

      // Wait for completion
      await waitFor(() => {
        expect(result.current.status).toBe('completed')
      }, { timeout: 10000 })

      // Status should remain completed
      await global.testUtils.wait(2000)
      expect(result.current.status).toBe('completed')
    })

    it('should handle timeout during polling', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      // Configure for timeout scenario
      global.testUtils?.configureMpesaScenario?.('timeout', '254708374152')

      const paymentData = global.testUtils.createMockPaymentData({
        phoneNumber: '254708374152'
      })

      await act(async () => {
        await result.current.initiatePayment(paymentData)
      })

      // Wait for timeout
      await waitFor(() => {
        expect(result.current.status).toBe('timeout')
      }, { timeout: 15000 })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      // Configure for network error
      global.testUtils?.configureMpesaScenario?.('network_error')

      const paymentData = global.testUtils.createMockPaymentData()

      await act(async () => {
        const success = await result.current.initiatePayment(paymentData)
        expect(success).toBe(false)
      })

      expect(result.current.status).toBe('failed')
      expect(result.current.error).toContain('network')
    })

    it('should handle API errors gracefully', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      // Configure for API error
      global.testUtils?.configureMpesaScenario?.('invalid_phone')

      const paymentData = global.testUtils.createMockPaymentData({
        phoneNumber: 'invalid'
      })

      await act(async () => {
        const success = await result.current.initiatePayment(paymentData)
        expect(success).toBe(false)
      })

      expect(result.current.status).toBe('failed')
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('Loading States', () => {
    it('should show loading during payment initiation', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      const paymentData = global.testUtils.createMockPaymentData()

      act(() => {
        result.current.initiatePayment(paymentData)
      })

      expect(result.current.loading).toBe(true)
      expect(result.current.status).toBe('initiating')

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should show loading during status checks', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMpesaPayment(), { wrapper })

      act(() => {
        result.current.checkTransactionStatus('tx_pending')
      })

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })
})
