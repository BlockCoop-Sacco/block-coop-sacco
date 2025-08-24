import { jest } from '@jest/globals';
import axios from 'axios';
import MpesaService from '../../../src/services/mpesaService.js';
import mpesaConfig from '../../../src/config/mpesa.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('MpesaService', () => {
  beforeEach(() => {
    // Reset the service state
    MpesaService.accessToken = null;
    MpesaService.tokenExpiry = null;
  });

  describe('generateTimestamp', () => {
    it('should generate timestamp in correct format', () => {
      const timestamp = MpesaService.generateTimestamp();
      
      expect(timestamp).toMatch(/^\d{14}$/);
      expect(timestamp.length).toBe(14);
    });

    it('should generate different timestamps when called at different times', async () => {
      const timestamp1 = MpesaService.generateTimestamp();
      await global.testUtils.wait(10);
      const timestamp2 = MpesaService.generateTimestamp();
      
      expect(timestamp1).not.toBe(timestamp2);
    });
  });

  describe('generatePassword', () => {
    it('should generate base64 encoded password', () => {
      const timestamp = '20231201120000';
      const password = MpesaService.generatePassword(timestamp);
      
      expect(password).toBeTruthy();
      expect(typeof password).toBe('string');
      
      // Should be base64 encoded
      const decoded = Buffer.from(password, 'base64').toString();
      expect(decoded).toContain('174379'); // Business short code
      expect(decoded).toContain(timestamp);
    });

    it('should generate consistent password for same timestamp', () => {
      const timestamp = '20231201120000';
      const password1 = MpesaService.generatePassword(timestamp);
      const password2 = MpesaService.generatePassword(timestamp);
      
      expect(password1).toBe(password2);
    });
  });

  describe('getAccessToken', () => {
    it('should fetch new access token when none exists', async () => {
      const mockResponse = {
        data: {
          access_token: 'test_access_token',
          expires_in: '3599'
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const token = await MpesaService.getAccessToken();
      
      expect(token).toBe('test_access_token');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('oauth/v1/generate'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic'),
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should return cached token if still valid', async () => {
      // Set up cached token
      MpesaService.accessToken = 'cached_token';
      MpesaService.tokenExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes from now
      
      const token = await MpesaService.getAccessToken();
      
      expect(token).toBe('cached_token');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should fetch new token if cached token is expired', async () => {
      // Set up expired token
      MpesaService.accessToken = 'expired_token';
      MpesaService.tokenExpiry = Date.now() - 1000; // 1 second ago
      
      const mockResponse = {
        data: {
          access_token: 'new_access_token',
          expires_in: '3599'
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const token = await MpesaService.getAccessToken();
      
      expect(token).toBe('new_access_token');
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should handle authentication errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Authentication failed'));
      
      await expect(MpesaService.getAccessToken()).rejects.toThrow('Failed to authenticate with M-Pesa');
    });
  });

  describe('initiateSTKPush', () => {
    beforeEach(() => {
      // Mock successful token generation
      MpesaService.accessToken = 'test_token';
      MpesaService.tokenExpiry = Date.now() + 30 * 60 * 1000;
    });

    it('should successfully initiate STK push', async () => {
      const mockResponse = {
        data: {
          ResponseCode: '0',
          ResponseDescription: 'Success. Request accepted for processing',
          CheckoutRequestID: 'ws_CO_123456789',
          MerchantRequestID: 'merchant_123456789'
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await MpesaService.initiateSTKPush(
        '254712345678',
        1000,
        'Test Account',
        'Test Transaction',
        'http://callback.url'
      );
      
      expect(result.success).toBe(true);
      expect(result.checkoutRequestId).toBe('ws_CO_123456789');
      expect(result.merchantRequestId).toBe('merchant_123456789');
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('stkpush'),
        expect.objectContaining({
          BusinessShortCode: '174379',
          TransactionType: 'CustomerPayBillOnline',
          Amount: 1000,
          PartyA: '254712345678',
          PhoneNumber: '254712345678',
          CallBackURL: 'http://callback.url',
          AccountReference: 'Test Account',
          TransactionDesc: 'Test Transaction'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle STK push failure', async () => {
      const mockResponse = {
        data: {
          ResponseCode: '1',
          ResponseDescription: 'Insufficient funds'
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await MpesaService.initiateSTKPush(
        '254712345678',
        1000,
        'Test Account',
        'Test Transaction',
        'http://callback.url'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });

    it('should handle network errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await MpesaService.initiateSTKPush(
        '254712345678',
        1000,
        'Test Account',
        'Test Transaction',
        'http://callback.url'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should round amount to integer', async () => {
      const mockResponse = {
        data: {
          ResponseCode: '0',
          CheckoutRequestID: 'ws_CO_123456789',
          MerchantRequestID: 'merchant_123456789'
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      await MpesaService.initiateSTKPush(
        '254712345678',
        1000.75, // Decimal amount
        'Test Account',
        'Test Transaction',
        'http://callback.url'
      );
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Amount: 1001 // Should be rounded
        }),
        expect.anything()
      );
    });
  });

  describe('querySTKPush', () => {
    beforeEach(() => {
      MpesaService.accessToken = 'test_token';
      MpesaService.tokenExpiry = Date.now() + 30 * 60 * 1000;
    });

    it('should successfully query STK push status', async () => {
      const mockResponse = {
        data: {
          ResponseCode: '0',
          ResponseDescription: 'The service request has been accepted successfully',
          CheckoutRequestID: 'ws_CO_123456789',
          ResultCode: '0',
          ResultDesc: 'The service request is processed successfully.'
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const result = await MpesaService.querySTKPush('ws_CO_123456789');
      
      expect(result.success).toBe(true);
      expect(result.data.CheckoutRequestID).toBe('ws_CO_123456789');
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('stkpushquery'),
        expect.objectContaining({
          BusinessShortCode: '174379',
          CheckoutRequestID: 'ws_CO_123456789'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token'
          })
        })
      );
    });

    it('should handle query errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Query failed'));
      
      const result = await MpesaService.querySTKPush('ws_CO_123456789');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Query failed');
    });
  });

  describe('parseCallbackData', () => {
    it('should parse successful callback data', () => {
      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant_123456789',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 1000 },
                { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
                { Name: 'TransactionDate', Value: 20231201120000 },
                { Name: 'PhoneNumber', Value: 254712345678 }
              ]
            }
          }
        }
      };
      
      const result = MpesaService.parseCallbackData(callbackData);
      
      expect(result.merchantRequestId).toBe('merchant_123456789');
      expect(result.checkoutRequestId).toBe('ws_CO_123456789');
      expect(result.resultCode).toBe(0);
      expect(result.amount).toBe(1000);
      expect(result.mpesaReceiptNumber).toBe('NLJ7RT61SV');
      expect(result.transactionDate).toBe(20231201120000);
      expect(result.phoneNumber).toBe(254712345678);
    });

    it('should parse failed callback data', () => {
      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant_123456789',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 1032,
            ResultDesc: 'Request cancelled by user'
          }
        }
      };
      
      const result = MpesaService.parseCallbackData(callbackData);
      
      expect(result.merchantRequestId).toBe('merchant_123456789');
      expect(result.checkoutRequestId).toBe('ws_CO_123456789');
      expect(result.resultCode).toBe(1032);
      expect(result.resultDesc).toBe('Request cancelled by user');
      expect(result.amount).toBeUndefined();
      expect(result.mpesaReceiptNumber).toBeUndefined();
    });

    it('should handle invalid callback data', () => {
      const invalidData = { invalid: 'data' };
      
      expect(() => {
        MpesaService.parseCallbackData(invalidData);
      }).toThrow('Failed to parse M-Pesa callback data');
    });
  });
});
