import { jest } from '@jest/globals';
import { Transaction, PaymentBridge } from '../../../src/models/Transaction.js';

describe('Transaction Model', () => {
  let testDb;

  beforeEach(async () => {
    testDb = global.testDatabase.getDatabase();
    await global.testDatabase.cleanup();
  });

  describe('create', () => {
    it('should create a new transaction', () => {
      const transactionData = {
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        packageId: 1,
        phoneNumber: '254708374149',
        amount: 100,
        kesAmount: 14925
      };

      const transaction = Transaction.create(transactionData);

      expect(transaction).toBeTruthy();
      expect(transaction.id).toBeTruthy();
      expect(transaction.user_wallet_address).toBe(transactionData.userWalletAddress);
      expect(transaction.package_id).toBe(transactionData.packageId);
      expect(transaction.phone_number).toBe(transactionData.phoneNumber);
      expect(transaction.amount).toBe(transactionData.amount);
      expect(transaction.kes_amount).toBe(transactionData.kesAmount);
      expect(transaction.status).toBe('pending');
      expect(transaction.created_at).toBeTruthy();
      expect(transaction.updated_at).toBeTruthy();
    });

    it('should create transaction with optional fields', () => {
      const transactionData = {
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        packageId: 1,
        phoneNumber: '254708374149',
        amount: 100,
        kesAmount: 14925,
        checkoutRequestId: 'ws_CO_123456789',
        merchantRequestId: 'merchant_123456789'
      };

      const transaction = Transaction.create(transactionData);

      expect(transaction.checkout_request_id).toBe(transactionData.checkoutRequestId);
      expect(transaction.merchant_request_id).toBe(transactionData.merchantRequestId);
    });

    it('should handle database errors', () => {
      // Mock database error by providing invalid data
      const invalidData = {
        // Missing required fields
        userWalletAddress: null
      };

      expect(() => {
        Transaction.create(invalidData);
      }).toThrow();
    });
  });

  describe('findById', () => {
    it('should find transaction by ID', () => {
      const transactionData = {
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        packageId: 1,
        phoneNumber: '254708374149',
        amount: 100,
        kesAmount: 14925
      };

      const createdTransaction = Transaction.create(transactionData);
      const foundTransaction = Transaction.findById(createdTransaction.id);

      expect(foundTransaction).toBeTruthy();
      expect(foundTransaction.id).toBe(createdTransaction.id);
      expect(foundTransaction.user_wallet_address).toBe(transactionData.userWalletAddress);
    });

    it('should return null for non-existent ID', () => {
      const transaction = Transaction.findById('non-existent-id');
      expect(transaction).toBeNull();
    });
  });

  describe('findByWalletAddress', () => {
    beforeEach(() => {
      // Create test transactions
      Transaction.create({
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        packageId: 1,
        phoneNumber: '254708374149',
        amount: 100,
        kesAmount: 14925
      });

      Transaction.create({
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        packageId: 2,
        phoneNumber: '254708374149',
        amount: 200,
        kesAmount: 29850
      });

      Transaction.create({
        userWalletAddress: '0x2345678901234567890123456789012345678901',
        packageId: 1,
        phoneNumber: '254708374150',
        amount: 150,
        kesAmount: 22387
      });
    });

    it('should find transactions by wallet address', () => {
      const transactions = Transaction.findByWalletAddress(
        '0x1234567890123456789012345678901234567890'
      );

      expect(transactions).toHaveLength(2);
      expect(transactions[0].user_wallet_address).toBe('0x1234567890123456789012345678901234567890');
      expect(transactions[1].user_wallet_address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should return empty array for non-existent wallet', () => {
      const transactions = Transaction.findByWalletAddress('0x9999999999999999999999999999999999999999');
      expect(transactions).toHaveLength(0);
    });

    it('should respect limit parameter', () => {
      const transactions = Transaction.findByWalletAddress(
        '0x1234567890123456789012345678901234567890',
        1
      );

      expect(transactions).toHaveLength(1);
    });

    it('should respect offset parameter', () => {
      const allTransactions = Transaction.findByWalletAddress(
        '0x1234567890123456789012345678901234567890'
      );
      
      const offsetTransactions = Transaction.findByWalletAddress(
        '0x1234567890123456789012345678901234567890',
        10,
        1
      );

      expect(offsetTransactions).toHaveLength(1);
      expect(offsetTransactions[0].id).toBe(allTransactions[1].id);
    });
  });

  describe('updateStatus', () => {
    let testTransaction;

    beforeEach(() => {
      testTransaction = Transaction.create({
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        packageId: 1,
        phoneNumber: '254708374149',
        amount: 100,
        kesAmount: 14925
      });
    });

    it('should update transaction status', () => {
      const updatedTransaction = Transaction.updateStatus(testTransaction.id, 'completed');

      expect(updatedTransaction.status).toBe('completed');
      expect(updatedTransaction.updated_at).not.toBe(testTransaction.updated_at);
    });

    it('should update with additional data', () => {
      const additionalData = {
        mpesaReceiptNumber: 'QHX12345',
        transactionDate: '20241217120000',
        blockchainTxHash: '0xabcdef123456'
      };

      const updatedTransaction = Transaction.updateStatus(
        testTransaction.id,
        'completed',
        additionalData
      );

      expect(updatedTransaction.status).toBe('completed');
      expect(updatedTransaction.mpesa_receipt_number).toBe('QHX12345');
      expect(updatedTransaction.transaction_date).toBe('20241217120000');
      expect(updatedTransaction.blockchain_tx_hash).toBe('0xabcdef123456');
    });

    it('should handle error messages', () => {
      const updatedTransaction = Transaction.updateStatus(
        testTransaction.id,
        'failed',
        { errorMessage: 'Payment failed' }
      );

      expect(updatedTransaction.status).toBe('failed');
      expect(updatedTransaction.error_message).toBe('Payment failed');
    });

    it('should handle non-existent transaction', () => {
      expect(() => {
        Transaction.updateStatus('non-existent-id', 'completed');
      }).toThrow();
    });
  });

  describe('getTransactionStats', () => {
    beforeEach(() => {
      // Create test transactions with different statuses
      Transaction.create({
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        packageId: 1,
        phoneNumber: '254708374149',
        amount: 100,
        kesAmount: 14925
      });

      const tx2 = Transaction.create({
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        packageId: 2,
        phoneNumber: '254708374149',
        amount: 200,
        kesAmount: 29850
      });

      const tx3 = Transaction.create({
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        packageId: 1,
        phoneNumber: '254708374149',
        amount: 150,
        kesAmount: 22387
      });

      // Update statuses
      Transaction.updateStatus(tx2.id, 'completed');
      Transaction.updateStatus(tx3.id, 'failed');
    });

    it('should return correct transaction statistics', () => {
      const stats = Transaction.getTransactionStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.totalAmount).toBe(450); // 100 + 200 + 150
      expect(stats.completedAmount).toBe(200); // Only completed transaction
    });
  });
});

describe('PaymentBridge Model', () => {
  beforeEach(async () => {
    await global.testDatabase.cleanup();
  });

  describe('create', () => {
    it('should create a new payment bridge record', () => {
      const bridgeData = {
        mpesaTransactionId: 'test-tx-123',
        packageId: 1,
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        usdtAmount: 100,
        referrerAddress: '0x2345678901234567890123456789012345678901'
      };

      const bridge = PaymentBridge.create(bridgeData);

      expect(bridge).toBeTruthy();
      expect(bridge.id).toBeTruthy();
      expect(bridge.mpesa_transaction_id).toBe(bridgeData.mpesaTransactionId);
      expect(bridge.package_id).toBe(bridgeData.packageId);
      expect(bridge.user_wallet_address).toBe(bridgeData.userWalletAddress);
      expect(bridge.usdt_amount).toBe(bridgeData.usdtAmount);
      expect(bridge.referrer_address).toBe(bridgeData.referrerAddress);
      expect(bridge.blockchain_status).toBe('pending');
      expect(bridge.created_at).toBeTruthy();
    });

    it('should create bridge without referrer address', () => {
      const bridgeData = {
        mpesaTransactionId: 'test-tx-123',
        packageId: 1,
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        usdtAmount: 100
      };

      const bridge = PaymentBridge.create(bridgeData);

      expect(bridge.referrer_address).toBeNull();
    });
  });

  describe('findByMpesaTransactionId', () => {
    it('should find bridge by M-Pesa transaction ID', () => {
      const bridgeData = {
        mpesaTransactionId: 'test-tx-123',
        packageId: 1,
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        usdtAmount: 100
      };

      PaymentBridge.create(bridgeData);
      const foundBridge = PaymentBridge.findByMpesaTransactionId('test-tx-123');

      expect(foundBridge).toBeTruthy();
      expect(foundBridge.mpesa_transaction_id).toBe('test-tx-123');
    });

    it('should return null for non-existent transaction ID', () => {
      const bridge = PaymentBridge.findByMpesaTransactionId('non-existent');
      expect(bridge).toBeNull();
    });
  });

  describe('updateBlockchainStatus', () => {
    let testBridge;

    beforeEach(() => {
      testBridge = PaymentBridge.create({
        mpesaTransactionId: 'test-tx-123',
        packageId: 1,
        userWalletAddress: '0x1234567890123456789012345678901234567890',
        usdtAmount: 100
      });
    });

    it('should update blockchain status', () => {
      const updatedBridge = PaymentBridge.updateBlockchainStatus(
        testBridge.id,
        'completed',
        '0xabcdef123456'
      );

      expect(updatedBridge.blockchain_status).toBe('completed');
      expect(updatedBridge.blockchain_tx_hash).toBe('0xabcdef123456');
    });

    it('should handle failed blockchain transactions', () => {
      const updatedBridge = PaymentBridge.updateBlockchainStatus(
        testBridge.id,
        'failed'
      );

      expect(updatedBridge.blockchain_status).toBe('failed');
      expect(updatedBridge.blockchain_tx_hash).toBeNull();
    });
  });
});
