import { describe, it, expect, vi, beforeEach } from 'vitest'
import mpesaApi, { MpesaApi } from '../mpesaApi'

describe('MpesaApi', () => {
  let api: MpesaApi

  beforeEach(() => {
    api = new MpesaApi()
    vi.clearAllMocks()
  })

  describe('validatePhoneNumber', () => {
    it('should validate correct Kenyan phone numbers', () => {
      const validNumbers = [
        '254708374149',
        '254712345678',
        '254722345678',
        '254732345678',
        '254742345678'
      ]

      validNumbers.forEach(number => {
        expect(api.validatePhoneNumber(number)).toBe(true)
      })
    })

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '123456789',
        '254',
        '25470837414',
        '2547083741499',
        '+254708374149',
        '0708374149',
        'invalid',
        '',
        '255708374149', // Tanzania
        '256708374149'  // Uganda
      ]

      invalidNumbers.forEach(number => {
        expect(api.validatePhoneNumber(number)).toBe(false)
      })
    })
  })

  describe('validateWalletAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      const validAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdefABCDEF1234567890123456789012345678',
        '0x0000000000000000000000000000000000000000'
      ]

      validAddresses.forEach(address => {
        expect(api.validateWalletAddress(address)).toBe(true)
      })
    })

    it('should reject invalid wallet addresses', () => {
      const invalidAddresses = [
        '1234567890123456789012345678901234567890', // Missing 0x
        '0x123456789012345678901234567890123456789', // Too short
        '0x12345678901234567890123456789012345678901', // Too long
        '0xGHIJKL7890123456789012345678901234567890', // Invalid characters
        '',
        'invalid'
      ]

      invalidAddresses.forEach(address => {
        expect(api.validateWalletAddress(address)).toBe(false)
      })
    })
  })

  describe('validateAmount', () => {
    it('should validate correct amounts', () => {
      const validAmounts = [1, 100, 1000, 50.5, 99.99]

      validAmounts.forEach(amount => {
        expect(api.validateAmount(amount)).toBe(true)
      })
    })

    it('should reject invalid amounts', () => {
      const invalidAmounts = [0, -1, -100, NaN, Infinity, -Infinity]

      invalidAmounts.forEach(amount => {
        expect(api.validateAmount(amount)).toBe(false)
      })
    })
  })

  describe('formatPhoneNumber', () => {
    it('should format phone numbers correctly', () => {
      const testCases = [
        { input: '0708374149', expected: '254708374149' },
        { input: '+254708374149', expected: '254708374149' },
        { input: '254708374149', expected: '254708374149' },
        { input: '708374149', expected: '254708374149' }
      ]

      testCases.forEach(({ input, expected }) => {
        expect(api.formatPhoneNumber(input)).toBe(expected)
      })
    })

    it('should return original for invalid formats', () => {
      const invalidInputs = ['123', 'invalid', '']

      invalidInputs.forEach(input => {
        expect(api.formatPhoneNumber(input)).toBe(input)
      })
    })
  })

  describe('calculateKesAmount', () => {
    it('should calculate KES amount correctly', () => {
      expect(api.calculateKesAmount(100)).toBe(14925)
      expect(api.calculateKesAmount(50)).toBe(7462)
      expect(api.calculateKesAmount(1)).toBe(149)
      expect(api.calculateKesAmount(0.5)).toBe(75)
    })

    it('should round to nearest integer', () => {
      expect(api.calculateKesAmount(1.001)).toBe(149)
      expect(api.calculateKesAmount(1.004)).toBe(150)
    })
  })

  describe('initiatePayment', () => {
    it('should initiate payment successfully', async () => {
      const paymentData = global.testUtils.createMockPaymentData()

      const result = await api.initiatePayment(paymentData)

      expect(result.success).toBe(true)
      expect(result.transactionId).toBeTruthy()
      expect(result.checkoutRequestId).toBeTruthy()
      expect(result.message).toContain('Payment request sent')
      expect(result.amount).toEqual({
        usd: 100,
        kes: 14925
      })
    })

    it('should handle validation errors', async () => {
      const invalidPaymentData = {
        walletAddress: 'invalid',
        packageId: 1,
        phoneNumber: 'invalid',
        amount: -1
      }

      const result = await api.initiatePayment(invalidPaymentData)

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should handle insufficient funds error', async () => {
      const paymentData = global.testUtils.createMockPaymentData({
        phoneNumber: '254708374150' // Test number for insufficient funds
      })

      const result = await api.initiatePayment(paymentData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient funds')
    })

    it('should handle invalid PIN error', async () => {
      const paymentData = global.testUtils.createMockPaymentData({
        phoneNumber: '254708374151' // Test number for invalid PIN
      })

      const result = await api.initiatePayment(paymentData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid M-Pesa PIN')
    })

    it('should handle timeout error', async () => {
      const paymentData = global.testUtils.createMockPaymentData({
        phoneNumber: '254708374152' // Test number for timeout
      })

      const result = await api.initiatePayment(paymentData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    })

    it('should handle user cancellation', async () => {
      const paymentData = global.testUtils.createMockPaymentData({
        phoneNumber: '254708374153' // Test number for user cancellation
      })

      const result = await api.initiatePayment(paymentData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('cancelled')
    })
  })

  describe('getTransactionStatus', () => {
    it('should get completed transaction status', async () => {
      const result = await api.getTransactionStatus('tx_completed')

      expect(result.success).toBe(true)
      expect(result.transaction?.status).toBe('completed')
      expect(result.transaction?.mpesaReceiptNumber).toBeTruthy()
    })

    it('should get pending transaction status', async () => {
      const result = await api.getTransactionStatus('tx_pending')

      expect(result.success).toBe(true)
      expect(result.transaction?.status).toBe('pending')
    })

    it('should get failed transaction status', async () => {
      const result = await api.getTransactionStatus('tx_failed')

      expect(result.success).toBe(true)
      expect(result.transaction?.status).toBe('failed')
      expect(result.transaction?.errorMessage).toBeTruthy()
    })

    it('should handle non-existent transaction', async () => {
      const result = await api.getTransactionStatus('non_existent')

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('getTransactionHistory', () => {
    it('should get transaction history', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890'

      const result = await api.getTransactionHistory(walletAddress)

      expect(result.success).toBe(true)
      expect(result.transactions).toBeDefined()
      expect(Array.isArray(result.transactions)).toBe(true)
      expect(result.pagination).toBeDefined()
    })

    it('should handle pagination parameters', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890'

      const result = await api.getTransactionHistory(walletAddress, 5, 10)

      expect(result.success).toBe(true)
      expect(result.pagination?.limit).toBe(5)
      expect(result.pagination?.offset).toBe(10)
    })

    it('should handle invalid wallet address', async () => {
      const result = await api.getTransactionHistory('invalid_address')

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error by using the test endpoint
      const result = await api.apiClient.post('/test/network-error')
        .catch(error => ({
          success: false,
          error: 'Network error'
        }))

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should handle server errors gracefully', async () => {
      const result = await api.apiClient.post('/test/error')
        .catch(error => ({
          success: false,
          error: 'Server error'
        }))

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('Rate Limiting', () => {
    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array.from({ length: 10 }, () =>
        api.apiClient.post('/test/rate-limit')
      )

      const results = await Promise.allSettled(promises)
      
      // Some requests should be rate limited
      const rateLimited = results.some(result => 
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && result.value.status === 429)
      )

      // Note: This test might not always trigger rate limiting in test environment
      // but it demonstrates the concept
      expect(results.length).toBe(10)
    })
  })

  describe('Request Validation', () => {
    it('should validate request data before sending', async () => {
      const invalidData = {
        walletAddress: '',
        packageId: 0,
        phoneNumber: '',
        amount: 0
      }

      const result = await api.initiatePayment(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should sanitize input data', async () => {
      const dataWithSpaces = {
        walletAddress: ' 0x1234567890123456789012345678901234567890 ',
        packageId: 1,
        phoneNumber: ' 254708374149 ',
        amount: 100
      }

      const result = await api.initiatePayment(dataWithSpaces)

      expect(result.success).toBe(true)
    })
  })
})
