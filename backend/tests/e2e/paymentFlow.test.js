import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import { Transaction, PaymentBridge } from '../../src/models/Transaction.js';
import mpesaService from '../../src/services/mpesaService.js';
import blockchainService from '../../src/services/blockchainService.js';

// Mock external services
jest.mock('../../src/services/mpesaService.js');
jest.mock('../../src/services/blockchainService.js');

describe('End-to-End Payment Flow Tests', () => {
  const testData = {
    walletAddress: '0x1234567890123456789012345678901234567890',
    packageId: 1,
    phoneNumber: '254712345678',
    amount: 100,
    kesAmount: 14925
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Payment Flow', () => {
    it('should complete full payment flow from initiation to blockchain', async () => {
      // Step 1: Initiate M-Pesa payment
      mpesaService.initiateSTKPush.mockResolvedValue({
        success: true,
        checkoutRequestId: 'ws_CO_123456789',
        merchantRequestId: 'merchant_123456789',
        responseDescription: 'Success. Request accepted for processing'
      });

      const initiateResponse = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send({
          walletAddress: testData.walletAddress,
          packageId: testData.packageId,
          phoneNumber: testData.phoneNumber,
          amount: testData.amount
        })
        .expect(200);

      expect(initiateResponse.body.success).toBe(true);
      const transactionId = initiateResponse.body.transactionId;
      const checkoutRequestId = initiateResponse.body.checkoutRequestId;

      // Step 2: Simulate M-Pesa callback (payment success)
      mpesaService.parseCallbackData.mockReturnValue({
        merchantRequestId: 'merchant_123456789',
        checkoutRequestId: checkoutRequestId,
        resultCode: 0,
        resultDesc: 'The service request is processed successfully.',
        amount: testData.kesAmount,
        mpesaReceiptNumber: 'NLJ7RT61SV',
        transactionDate: 20231201120000,
        phoneNumber: testData.phoneNumber
      });

      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant_123456789',
            CheckoutRequestID: checkoutRequestId,
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: testData.kesAmount },
                { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
                { Name: 'TransactionDate', Value: 20231201120000 },
                { Name: 'PhoneNumber', Value: testData.phoneNumber }
              ]
            }
          }
        }
      };

      const callbackResponse = await request(app)
        .post(`/api/mpesa/callback/${transactionId}`)
        .send(callbackData)
        .expect(200);

      expect(callbackResponse.body.ResultCode).toBe(0);

      // Step 3: Verify transaction status
      mpesaService.querySTKPush.mockResolvedValue({
        success: true,
        data: {
          ResponseCode: '0',
          ResultCode: '0',
          ResultDesc: 'The service request is processed successfully.'
        }
      });

      const statusResponse = await request(app)
        .get(`/api/mpesa/status/${checkoutRequestId}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.transaction.status).toBe('completed');

      // Step 4: Complete blockchain purchase
      blockchainService.getPackageDetails.mockResolvedValue({
        id: testData.packageId,
        entryUSDT: BigInt(testData.amount * 1e6), // 100 USDT with 6 decimals
        active: true,
        exists: true
      });

      blockchainService.executePurchaseForUser.mockResolvedValue({
        success: true,
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        gasUsed: '21000',
        blockNumber: 12345
      });

      const bridgeResponse = await request(app)
        .post('/api/bridge/complete-purchase')
        .send({ transactionId })
        .expect(200);

      expect(bridgeResponse.body.success).toBe(true);
      expect(bridgeResponse.body.txHash).toBeTruthy();

      // Step 5: Verify final transaction state
      const finalStatusResponse = await request(app)
        .get(`/api/bridge/status/${transactionId}`)
        .expect(200);

      expect(finalStatusResponse.body.success).toBe(true);
      expect(finalStatusResponse.body.mpesaStatus).toBe('completed');
      expect(finalStatusResponse.body.blockchainStatus).toBe('completed');
      expect(finalStatusResponse.body.blockchainTxHash).toBeTruthy();
    });

    it('should handle M-Pesa payment failure gracefully', async () => {
      // Step 1: Initiate M-Pesa payment
      mpesaService.initiateSTKPush.mockResolvedValue({
        success: true,
        checkoutRequestId: 'ws_CO_123456789',
        merchantRequestId: 'merchant_123456789'
      });

      const initiateResponse = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send({
          walletAddress: testData.walletAddress,
          packageId: testData.packageId,
          phoneNumber: testData.phoneNumber,
          amount: testData.amount
        })
        .expect(200);

      const transactionId = initiateResponse.body.transactionId;
      const checkoutRequestId = initiateResponse.body.checkoutRequestId;

      // Step 2: Simulate M-Pesa callback (payment failure)
      mpesaService.parseCallbackData.mockReturnValue({
        merchantRequestId: 'merchant_123456789',
        checkoutRequestId: checkoutRequestId,
        resultCode: 1032,
        resultDesc: 'Request cancelled by user'
      });

      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant_123456789',
            CheckoutRequestID: checkoutRequestId,
            ResultCode: 1032,
            ResultDesc: 'Request cancelled by user'
          }
        }
      };

      await request(app)
        .post(`/api/mpesa/callback/${transactionId}`)
        .send(callbackData)
        .expect(200);

      // Step 3: Verify transaction status shows failure
      mpesaService.querySTKPush.mockResolvedValue({
        success: true,
        data: {
          ResponseCode: '0',
          ResultCode: '1032',
          ResultDesc: 'Request cancelled by user'
        }
      });

      const statusResponse = await request(app)
        .get(`/api/mpesa/status/${checkoutRequestId}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.transaction.status).toBe('failed');

      // Step 4: Verify no blockchain transaction was attempted
      const bridgeResponse = await request(app)
        .post('/api/bridge/complete-purchase')
        .send({ transactionId })
        .expect(400);

      expect(bridgeResponse.body.success).toBe(false);
      expect(bridgeResponse.body.error).toContain('not completed');
    });

    it('should handle blockchain failure after successful M-Pesa payment', async () => {
      // Step 1: Complete M-Pesa payment successfully
      mpesaService.initiateSTKPush.mockResolvedValue({
        success: true,
        checkoutRequestId: 'ws_CO_123456789',
        merchantRequestId: 'merchant_123456789'
      });

      const initiateResponse = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send({
          walletAddress: testData.walletAddress,
          packageId: testData.packageId,
          phoneNumber: testData.phoneNumber,
          amount: testData.amount
        })
        .expect(200);

      const transactionId = initiateResponse.body.transactionId;

      // Simulate successful M-Pesa callback
      mpesaService.parseCallbackData.mockReturnValue({
        merchantRequestId: 'merchant_123456789',
        checkoutRequestId: 'ws_CO_123456789',
        resultCode: 0,
        amount: testData.kesAmount,
        mpesaReceiptNumber: 'NLJ7RT61SV'
      });

      await request(app)
        .post(`/api/mpesa/callback/${transactionId}`)
        .send({
          Body: {
            stkCallback: {
              MerchantRequestID: 'merchant_123456789',
              CheckoutRequestID: 'ws_CO_123456789',
              ResultCode: 0
            }
          }
        })
        .expect(200);

      // Step 2: Simulate blockchain failure
      blockchainService.getPackageDetails.mockResolvedValue({
        id: testData.packageId,
        entryUSDT: BigInt(testData.amount * 1e6),
        active: true,
        exists: true
      });

      blockchainService.executePurchaseForUser.mockRejectedValue(
        new Error('Insufficient gas')
      );

      const bridgeResponse = await request(app)
        .post('/api/bridge/complete-purchase')
        .send({ transactionId })
        .expect(200);

      expect(bridgeResponse.body.success).toBe(false);
      expect(bridgeResponse.body.error).toContain('Blockchain transaction failed');

      // Step 3: Verify bridge status shows blockchain failure
      const statusResponse = await request(app)
        .get(`/api/bridge/status/${transactionId}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.mpesaStatus).toBe('completed');
      expect(statusResponse.body.blockchainStatus).toBe('failed');
    });

    it('should handle payment timeout scenario', async () => {
      // Step 1: Initiate payment
      mpesaService.initiateSTKPush.mockResolvedValue({
        success: true,
        checkoutRequestId: 'ws_CO_123456789',
        merchantRequestId: 'merchant_123456789'
      });

      const initiateResponse = await request(app)
        .post('/api/mpesa/initiate-payment')
        .send({
          walletAddress: testData.walletAddress,
          packageId: testData.packageId,
          phoneNumber: testData.phoneNumber,
          amount: testData.amount
        })
        .expect(200);

      const transactionId = initiateResponse.body.transactionId;

      // Step 2: Simulate timeout callback
      await request(app)
        .post(`/api/mpesa/timeout/${transactionId}`)
        .send({})
        .expect(200);

      // Step 3: Verify transaction status
      mpesaService.querySTKPush.mockResolvedValue({
        success: true,
        data: {
          ResponseCode: '0',
          ResultCode: '1037',
          ResultDesc: 'STK Push timeout'
        }
      });

      const statusResponse = await request(app)
        .get(`/api/mpesa/status/ws_CO_123456789`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.transaction.status).toBe('timeout');
    });
  });

  describe('Recovery Flow Tests', () => {
    it('should recover stuck pending transaction', async () => {
      // Create a stuck pending transaction
      const stuckTransaction = global.testUtils.createTestTransaction({
        status: 'pending',
        checkoutRequestId: 'ws_CO_123456789',
        createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString() // 35 minutes ago
      });

      // Mock M-Pesa query to show it's actually completed
      mpesaService.querySTKPush.mockResolvedValue({
        success: true,
        data: {
          ResponseCode: '0',
          ResultCode: '0',
          ResultDesc: 'The service request is processed successfully.'
        }
      });

      // Trigger recovery
      const recoveryResponse = await request(app)
        .post(`/api/recovery/recover/${stuckTransaction.id}`)
        .expect(200);

      expect(recoveryResponse.body.success).toBe(true);
      expect(recoveryResponse.body.message).toContain('completed');
    });

    it('should handle manual recovery actions', async () => {
      const testTransaction = global.testUtils.createTestTransaction({
        status: 'failed'
      });

      // Test manual retry
      const retryResponse = await request(app)
        .post(`/api/recovery/manual/${testTransaction.id}`)
        .set('x-api-key', 'test_api_key')
        .send({ action: 'retry_mpesa_query' })
        .expect(200);

      expect(retryResponse.body.success).toBe(true);
      expect(retryResponse.body.action).toBe('retry_mpesa_query');
    });
  });
});
