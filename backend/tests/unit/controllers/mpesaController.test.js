import { jest } from '@jest/globals';
import MpesaController from '../../../src/controllers/mpesaController.js';
import { Transaction, PaymentBridge } from '../../../src/models/Transaction.js';
import mpesaService from '../../../src/services/mpesaService.js';

// Mock dependencies
jest.mock('../../../src/models/Transaction.js');
jest.mock('../../../src/services/mpesaService.js');

describe('MpesaController', () => {
  let mpesaController;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mpesaController = new MpesaController();
    
    mockReq = {
      body: {},
      params: {},
      ip: '127.0.0.1'
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('initiatePayment', () => {
    const validPaymentData = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      packageId: 1,
      phoneNumber: '254708374149',
      amount: 100,
      referrerAddress: '0x2345678901234567890123456789012345678901'
    };

    beforeEach(() => {
      mockReq.body = { ...validPaymentData };
    });

    it('should successfully initiate payment', async () => {
      const mockTransaction = {
        id: 'test-tx-123',
        ...validPaymentData,
        kesAmount: 14925,
        status: 'pending'
      };

      const mockStkResult = {
        success: true,
        checkoutRequestId: 'ws_CO_123456789',
        merchantRequestId: 'merchant_123456789'
      };

      Transaction.create.mockReturnValue(mockTransaction);
      Transaction.updateStatus.mockReturnValue({ ...mockTransaction, status: 'pending' });
      mpesaService.initiateSTKPush.mockResolvedValue(mockStkResult);

      await mpesaController.initiatePayment(mockReq, mockRes);

      expect(Transaction.create).toHaveBeenCalledWith({
        userWalletAddress: validPaymentData.walletAddress,
        packageId: validPaymentData.packageId,
        phoneNumber: validPaymentData.phoneNumber,
        amount: validPaymentData.amount,
        kesAmount: 14925
      });

      expect(mpesaService.initiateSTKPush).toHaveBeenCalledWith(
        validPaymentData.phoneNumber,
        14925,
        'Package-1',
        'USDT Package Purchase - 100 USD',
        expect.stringContaining('/api/mpesa/callback/')
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        transactionId: 'test-tx-123',
        checkoutRequestId: 'ws_CO_123456789',
        message: 'Payment request sent to your phone. Please enter your M-Pesa PIN to complete the transaction.',
        amount: {
          usd: 100,
          kes: 14925
        }
      });
    });

    it('should reject payment with amount too small', async () => {
      mockReq.body.amount = 0.005; // Results in KES < 1

      await mpesaController.initiatePayment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Amount too small. Minimum payment is KES 1.'
      });
    });

    it('should handle M-Pesa service failure', async () => {
      const mockTransaction = {
        id: 'test-tx-123',
        ...validPaymentData,
        kesAmount: 14925
      };

      const mockStkResult = {
        success: false,
        error: 'Insufficient funds'
      };

      Transaction.create.mockReturnValue(mockTransaction);
      mpesaService.initiateSTKPush.mockResolvedValue(mockStkResult);

      await mpesaController.initiatePayment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient funds'
      });
    });

    it('should handle database errors', async () => {
      Transaction.create.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await mpesaController.initiatePayment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error'
      });
    });

    it('should calculate KES amount correctly', async () => {
      mockReq.body.amount = 50; // USD

      const mockTransaction = {
        id: 'test-tx-123',
        ...mockReq.body,
        kesAmount: 7462 // 50 * 149.25 rounded
      };

      Transaction.create.mockReturnValue(mockTransaction);
      mpesaService.initiateSTKPush.mockResolvedValue({
        success: true,
        checkoutRequestId: 'ws_CO_123456789',
        merchantRequestId: 'merchant_123456789'
      });

      await mpesaController.initiatePayment(mockReq, mockRes);

      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50,
          kesAmount: 7462
        })
      );
    });
  });

  describe('handleCallback', () => {
    const mockTransactionId = 'test-tx-123';
    const mockTransaction = {
      id: mockTransactionId,
      package_id: 1,
      user_wallet_address: '0x1234567890123456789012345678901234567890',
      amount: 100,
      status: 'pending'
    };

    beforeEach(() => {
      mockReq.params.transactionId = mockTransactionId;
      Transaction.findById.mockReturnValue(mockTransaction);
    });

    it('should handle successful payment callback', async () => {
      const successCallbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant_123456789',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 14925 },
                { Name: 'MpesaReceiptNumber', Value: 'QHX12345TEST' },
                { Name: 'TransactionDate', Value: 20241217120000 },
                { Name: 'PhoneNumber', Value: 254708374149 }
              ]
            }
          }
        }
      };

      mockReq.body = successCallbackData;

      const mockParsedData = {
        success: true,
        resultCode: 0,
        mpesaReceiptNumber: 'QHX12345TEST',
        transactionDate: '20241217120000'
      };

      mpesaService.parseCallbackData.mockReturnValue(mockParsedData);
      Transaction.updateStatus.mockReturnValue({ ...mockTransaction, status: 'completed' });
      PaymentBridge.create.mockReturnValue({ id: 'bridge-123' });

      await mpesaController.handleCallback(mockReq, mockRes);

      expect(Transaction.updateStatus).toHaveBeenCalledWith(
        mockTransactionId,
        'completed',
        {
          mpesaReceiptNumber: 'QHX12345TEST',
          transactionDate: '20241217120000'
        }
      );

      expect(PaymentBridge.create).toHaveBeenCalledWith({
        mpesaTransactionId: mockTransactionId,
        packageId: 1,
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        usdtAmount: 100,
        referrerAddress: null
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        ResultCode: 0,
        ResultDesc: 'Success'
      });
    });

    it('should handle failed payment callback', async () => {
      const failedCallbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant_123456789',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 1032,
            ResultDesc: 'Request cancelled by user'
          }
        }
      };

      mockReq.body = failedCallbackData;

      const mockParsedData = {
        success: false,
        resultCode: 1032,
        resultDesc: 'Request cancelled by user'
      };

      mpesaService.parseCallbackData.mockReturnValue(mockParsedData);
      Transaction.updateStatus.mockReturnValue({ ...mockTransaction, status: 'failed' });

      await mpesaController.handleCallback(mockReq, mockRes);

      expect(Transaction.updateStatus).toHaveBeenCalledWith(
        mockTransactionId,
        'failed',
        {
          errorMessage: 'Request cancelled by user'
        }
      );

      expect(PaymentBridge.create).not.toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith({
        ResultCode: 0,
        ResultDesc: 'Success'
      });
    });

    it('should handle transaction not found', async () => {
      Transaction.findById.mockReturnValue(null);

      await mpesaController.handleCallback(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Transaction not found'
      });
    });

    it('should handle malformed callback data', async () => {
      mockReq.body = { invalid: 'data' };

      mpesaService.parseCallbackData.mockReturnValue({
        success: false,
        error: 'Invalid callback data structure'
      });

      await mpesaController.handleCallback(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid callback data structure'
      });
    });
  });

  describe('getTransactionStatus', () => {
    it('should return transaction status', async () => {
      const mockTransaction = {
        id: 'test-tx-123',
        status: 'completed',
        amount: 100,
        kesAmount: 14925,
        phoneNumber: '254708374149',
        mpesaReceiptNumber: 'QHX12345',
        createdAt: '2024-12-17T12:00:00Z',
        updatedAt: '2024-12-17T12:05:00Z'
      };

      mockReq.params.transactionId = 'test-tx-123';
      Transaction.findById.mockReturnValue(mockTransaction);

      await mpesaController.getTransactionStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        transaction: mockTransaction
      });
    });

    it('should handle transaction not found', async () => {
      mockReq.params.transactionId = 'non-existent';
      Transaction.findById.mockReturnValue(null);

      await mpesaController.getTransactionStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Transaction not found'
      });
    });
  });
});
