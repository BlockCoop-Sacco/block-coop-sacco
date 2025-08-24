import { Transaction, PaymentBridge } from '../models/Transaction.js';
import blockchainService from '../services/blockchainService.js';
import logger from '../config/logger.js';
import db from '../config/database.js';

class BridgeController {
  // Process completed M-Pesa payments and execute blockchain transactions
  async processCompletedPayments(req, res) {
    try {
      // This endpoint can be called periodically to process pending payments
      // or triggered by webhooks
      
      const pendingTransactions = await this.getPendingTransactions();
      const results = [];

      for (const transaction of pendingTransactions) {
        try {
          const result = await this.processSingleTransaction(transaction);
          results.push(result);
        } catch (error) {
          logger.error('Error processing transaction:', {
            transactionId: transaction.id,
            error: error.message
          });
          results.push({
            transactionId: transaction.id,
            success: false,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        processed: results.length,
        results
      });
    } catch (error) {
      logger.error('Error in processCompletedPayments:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Complete purchase after M-Pesa payment
  async completePurchase(req, res) {
    try {
      const { transactionId } = req.body;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'Transaction ID is required'
        });
      }

      // Find the M-Pesa transaction
      const mpesaTransaction = Transaction.findById(transactionId);
      if (!mpesaTransaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      if (mpesaTransaction.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'M-Pesa payment not completed'
        });
      }

      // Check if already processed
      const existingBridge = await this.findBridgeByMpesaTransaction(transactionId);
      if (existingBridge && existingBridge.blockchain_status === 'completed') {
        return res.json({
          success: true,
          message: 'Purchase already completed',
          txHash: existingBridge.smart_contract_tx_hash
        });
      }

      // Process the transaction
      const result = await this.processSingleTransaction(mpesaTransaction);

      res.json(result);
    } catch (error) {
      logger.error('Error in completePurchase:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get pending transactions that need blockchain processing
  async getPendingTransactions() {
    try {
      // Get completed M-Pesa transactions that haven't been processed on blockchain
      const query = `
        SELECT mt.* FROM mpesa_transactions mt
        LEFT JOIN payment_bridge pb ON mt.id = pb.mpesa_transaction_id
        WHERE mt.status = 'completed' 
        AND (pb.blockchain_status IS NULL OR pb.blockchain_status = 'pending')
        ORDER BY mt.created_at ASC
        LIMIT 10
      `;
      
      const stmt = db.prepare(query);
      return stmt.all();
    } catch (error) {
      logger.error('Error getting pending transactions:', error);
      throw error;
    }
  }

  // Find bridge record by M-Pesa transaction ID
  async findBridgeByMpesaTransaction(mpesaTransactionId) {
    try {
      const stmt = db.prepare('SELECT * FROM payment_bridge WHERE mpesa_transaction_id = ?');
      return stmt.get(mpesaTransactionId);
    } catch (error) {
      logger.error('Error finding bridge record:', error);
      throw error;
    }
  }

  // Process a single transaction
  async processSingleTransaction(mpesaTransaction) {
    try {
      logger.info('Processing M-Pesa transaction for blockchain', {
        transactionId: mpesaTransaction.id,
        walletAddress: mpesaTransaction.user_wallet_address,
        packageId: mpesaTransaction.package_id,
        amount: mpesaTransaction.amount
      });

      // Create or update payment bridge record
      let bridgeRecord = await this.findBridgeByMpesaTransaction(mpesaTransaction.id);
      
      if (!bridgeRecord) {
        bridgeRecord = PaymentBridge.create({
          mpesaTransactionId: mpesaTransaction.id,
          packageId: mpesaTransaction.package_id,
          userWalletAddress: mpesaTransaction.user_wallet_address,
          usdtAmount: mpesaTransaction.amount,
          referrerAddress: null // Could be extracted from original request
        });
      }

      // Update status to pending
      PaymentBridge.updateBlockchainStatus(bridgeRecord.id, 'pending');

      // Execute blockchain transaction
      const blockchainResult = await blockchainService.executePurchaseForUser(
        mpesaTransaction.user_wallet_address,
        mpesaTransaction.package_id,
        null // referrer address
      );

      if (blockchainResult.success) {
        // Update bridge record with success
        PaymentBridge.updateBlockchainStatus(
          bridgeRecord.id, 
          'completed', 
          blockchainResult.txHash
        );

        // Update M-Pesa transaction with blockchain hash
        Transaction.updateStatus(mpesaTransaction.id, 'completed', {
          blockchainTxHash: blockchainResult.txHash
        });

        logger.info('Successfully completed blockchain purchase', {
          mpesaTransactionId: mpesaTransaction.id,
          blockchainTxHash: blockchainResult.txHash,
          userAddress: mpesaTransaction.user_wallet_address
        });

        return {
          transactionId: mpesaTransaction.id,
          success: true,
          txHash: blockchainResult.txHash,
          gasUsed: blockchainResult.gasUsed,
          blockNumber: blockchainResult.blockNumber
        };
      } else {
        // Update bridge record with failure
        PaymentBridge.updateBlockchainStatus(bridgeRecord.id, 'failed');
        
        logger.error('Blockchain purchase failed', {
          mpesaTransactionId: mpesaTransaction.id,
          error: blockchainResult.error
        });

        return {
          transactionId: mpesaTransaction.id,
          success: false,
          error: 'Blockchain transaction failed'
        };
      }
    } catch (error) {
      logger.error('Error processing single transaction:', error);
      
      // Update bridge record with failure if it exists
      const bridgeRecord = await this.findBridgeByMpesaTransaction(mpesaTransaction.id);
      if (bridgeRecord) {
        PaymentBridge.updateBlockchainStatus(bridgeRecord.id, 'failed');
      }

      throw error;
    }
  }

  // Get bridge status for a transaction
  async getBridgeStatus(req, res) {
    try {
      const { transactionId } = req.params;

      const mpesaTransaction = Transaction.findById(transactionId);
      if (!mpesaTransaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      const bridgeRecord = await this.findBridgeByMpesaTransaction(transactionId);

      res.json({
        success: true,
        mpesaStatus: mpesaTransaction.status,
        blockchainStatus: bridgeRecord?.blockchain_status || 'not_started',
        blockchainTxHash: bridgeRecord?.smart_contract_tx_hash || mpesaTransaction.blockchain_tx_hash,
        createdAt: mpesaTransaction.created_at,
        updatedAt: mpesaTransaction.updated_at
      });
    } catch (error) {
      logger.error('Error getting bridge status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Manual retry for failed transactions
  async retryTransaction(req, res) {
    try {
      const { transactionId } = req.params;

      const mpesaTransaction = Transaction.findById(transactionId);
      if (!mpesaTransaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      if (mpesaTransaction.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'M-Pesa payment not completed'
        });
      }

      const result = await this.processSingleTransaction(mpesaTransaction);
      res.json(result);
    } catch (error) {
      logger.error('Error retrying transaction:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export default new BridgeController();
