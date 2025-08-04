import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import mpesaApi from '../../services/mpesaApi';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('MpesaApiService Enhanced Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock axios.create to return the mocked axios instance
    mockedAxios.create.mockReturnValue(mockedAxios);
    
    // Mock interceptors
    mockedAxios.interceptors = {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    };
  });

  describe('initiatePayment error handling', () => {
    const validPaymentData = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      packageId: 1,
      phoneNumber: '254712345678',
      amount: 100
    };

    it('should handle network connection errors', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ERR_NETWORK';
      mockedAxios.post.mockRejectedValue(networkError);

      const result = await mpesaApi.initiatePayment(validPaymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unable to connect to M-Pesa service. Please check your internet connection and try again.');
    });

    it('should handle connection refused errors', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';
      mockedAxios.post.mockRejectedValue(connectionError);

      const result = await mpesaApi.initiatePayment(validPaymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unable to connect to M-Pesa service. Please check your internet connection and try again.');
    });

    it('should handle DNS resolution errors', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND');
      dnsError.code = 'ENOTFOUND';
      mockedAxios.post.mockRejectedValue(dnsError);

      const result = await mpesaApi.initiatePayment(validPaymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('M-Pesa service is currently unavailable. Please try again later.');
    });

    it('should handle 400 Bad Request errors', async () => {
      const badRequestError = {
        response: {
          status: 400,
          data: { error: 'Invalid phone number format' }
        }
      };
      mockedAxios.post.mockRejectedValue(badRequestError);

      const result = await mpesaApi.initiatePayment(validPaymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });

    it('should handle 429 Rate Limit errors', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: { error: 'Too many requests' }
        }
      };
      mockedAxios.post.mockRejectedValue(rateLimitError);

      const result = await mpesaApi.initiatePayment(validPaymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Too many payment requests. Please wait a moment and try again.');
    });

    it('should handle 500 Server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      };
      mockedAxios.post.mockRejectedValue(serverError);

      const result = await mpesaApi.initiatePayment(validPaymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('M-Pesa service is temporarily unavailable. Please try again in a few minutes.');
    });
  });

  describe('queryPaymentStatus error handling', () => {
    const checkoutRequestId = 'ws_CO_123456789';

    it('should handle 404 Not Found errors', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { error: 'Transaction not found' }
        }
      };
      mockedAxios.get.mockRejectedValue(notFoundError);

      const result = await mpesaApi.queryPaymentStatus(checkoutRequestId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment transaction not found. Please check the transaction ID.');
    });

    it('should handle network errors for status queries', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ERR_NETWORK';
      mockedAxios.get.mockRejectedValue(networkError);

      const result = await mpesaApi.queryPaymentStatus(checkoutRequestId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unable to connect to M-Pesa service. Please check your internet connection.');
    });
  });

  describe('successful responses', () => {
    it('should handle successful payment initiation', async () => {
      const mockResponse = {
        data: {
          success: true,
          transactionId: 'test-transaction-id',
          checkoutRequestId: 'ws_CO_123456789',
          message: 'Payment request sent to your phone',
          amount: {
            usd: 100,
            kes: 14925
          }
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await mpesaApi.initiatePayment({
        walletAddress: '0x1234567890123456789012345678901234567890',
        packageId: 1,
        phoneNumber: '254712345678',
        amount: 100
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('test-transaction-id');
      expect(result.checkoutRequestId).toBe('ws_CO_123456789');
    });
  });
});
