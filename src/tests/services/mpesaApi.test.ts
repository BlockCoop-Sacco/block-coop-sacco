import { jest } from '@jest/globals';
import axios from 'axios';
import mpesaApi from '../../services/mpesaApi';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MpesaApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create to return the mocked axios instance
    mockedAxios.create.mockReturnValue(mockedAxios);
    
    // Mock interceptors
    mockedAxios.interceptors = {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    } as any;
  });

  describe('initiatePayment', () => {
    const validPaymentData = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      packageId: 1,
      phoneNumber: '254712345678',
      amount: 100
    };

    it('should successfully initiate payment', async () => {
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

      const result = await mpesaApi.initiatePayment(validPaymentData);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('test-transaction-id');
      expect(result.checkoutRequestId).toBe('ws_CO_123456789');
      expect(result.amount?.usd).toBe(100);
      expect(result.amount?.kes).toBe(14925);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/mpesa/initiate-payment',
        validPaymentData
      );
    });

    it('should handle API error response', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: 'Insufficient funds'
          }
        }
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const result = await mpesaApi.initiatePayment(validPaymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });

    it('should handle network error', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.post.mockRejectedValue(networkError);

      const result = await mpesaApi.initiatePayment(validPaymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });

    it('should handle unknown error', async () => {
      mockedAxios.post.mockRejectedValue({});

      const result = await mpesaApi.initiatePayment(validPaymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to initiate payment');
    });
  });

  describe('queryPaymentStatus', () => {
    const checkoutRequestId = 'ws_CO_123456789';

    it('should successfully query payment status', async () => {
      const mockResponse = {
        data: {
          success: true,
          transaction: {
            id: 'test-transaction-id',
            status: 'completed',
            amount: {
              usd: 100,
              kes: 14925
            },
            phoneNumber: '254712345678',
            createdAt: '2023-12-01T12:00:00Z'
          },
          mpesaStatus: {
            resultCode: '0',
            resultDesc: 'Success'
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await mpesaApi.queryPaymentStatus(checkoutRequestId);

      expect(result.success).toBe(true);
      expect(result.transaction?.status).toBe('completed');
      expect(result.mpesaStatus?.resultCode).toBe('0');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/mpesa/status/${checkoutRequestId}`
      );
    });

    it('should handle query error', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: 'Transaction not found'
          }
        }
      };

      mockedAxios.get.mockRejectedValue(mockError);

      const result = await mpesaApi.queryPaymentStatus(checkoutRequestId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction not found');
    });
  });

  describe('getTransactionHistory', () => {
    const walletAddress = '0x1234567890123456789012345678901234567890';

    it('should successfully get transaction history', async () => {
      const mockResponse = {
        data: {
          success: true,
          transactions: [
            {
              id: 'test-transaction-1',
              packageId: 1,
              amount: { usd: 100, kes: 14925 },
              phoneNumber: '254712345678',
              status: 'completed',
              createdAt: '2023-12-01T12:00:00Z'
            }
          ],
          stats: {
            totalTransactions: 1,
            completedTransactions: 1,
            failedTransactions: 0,
            pendingTransactions: 0,
            totalAmountUsd: 100,
            totalAmountKes: 14925
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await mpesaApi.getTransactionHistory(walletAddress);

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(1);
      expect(result.stats?.totalTransactions).toBe(1);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/mpesa/transactions/${walletAddress}?limit=50&offset=0`
      );
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        data: {
          success: true,
          transactions: [],
          stats: {
            totalTransactions: 0,
            completedTransactions: 0,
            failedTransactions: 0,
            pendingTransactions: 0,
            totalAmountUsd: 0,
            totalAmountKes: 0
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await mpesaApi.getTransactionHistory(walletAddress, 10, 20);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/mpesa/transactions/${walletAddress}?limit=10&offset=20`
      );
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct Kenyan phone number', () => {
      expect(mpesaApi.validatePhoneNumber('254712345678')).toBe(true);
      expect(mpesaApi.validatePhoneNumber('254722345678')).toBe(true);
      expect(mpesaApi.validatePhoneNumber('254732345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(mpesaApi.validatePhoneNumber('0712345678')).toBe(false);
      expect(mpesaApi.validatePhoneNumber('254712345')).toBe(false);
      expect(mpesaApi.validatePhoneNumber('25471234567890')).toBe(false);
      expect(mpesaApi.validatePhoneNumber('123456789')).toBe(false);
      expect(mpesaApi.validatePhoneNumber('')).toBe(false);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format phone numbers correctly', () => {
      expect(mpesaApi.formatPhoneNumber('0712345678')).toBe('254712345678');
      expect(mpesaApi.formatPhoneNumber('712345678')).toBe('254712345678');
      expect(mpesaApi.formatPhoneNumber('254712345678')).toBe('254712345678');
      expect(mpesaApi.formatPhoneNumber('+254712345678')).toBe('254712345678');
    });

    it('should handle invalid input gracefully', () => {
      expect(mpesaApi.formatPhoneNumber('abc')).toBe('');
      expect(mpesaApi.formatPhoneNumber('')).toBe('');
      expect(mpesaApi.formatPhoneNumber('123')).toBe('254123');
    });
  });

  describe('currency conversion', () => {
    it('should convert USD to KES correctly', () => {
      expect(mpesaApi.convertUsdToKes(100)).toBe(14925);
      expect(mpesaApi.convertUsdToKes(1)).toBe(149);
      expect(mpesaApi.convertUsdToKes(0.5)).toBe(75);
    });

    it('should convert KES to USD correctly', () => {
      expect(mpesaApi.convertKesToUsd(14925)).toBe(100.0075);
      expect(mpesaApi.convertKesToUsd(149)).toBe(0.9983);
      expect(mpesaApi.convertKesToUsd(1000)).toBe(6.7);
    });

    it('should handle zero amounts', () => {
      expect(mpesaApi.convertUsdToKes(0)).toBe(0);
      expect(mpesaApi.convertKesToUsd(0)).toBe(0);
    });
  });
});
