import { Transaction, PaymentBridge } from '../models/Transaction.js';
import mpesaService from './mpesaService.js';
import blockchainService from './blockchainService.js';
import errorHandler from './errorHandler.js';
import logger from '../config/logger.js';
import db from '../config/database.js';

class RecoveryService {
  constructor() {
    this.recoveryQueue = new Map();
    this.isProcessing = false;
  }

  // Start automatic recovery process
  startRecoveryProcess() {
    // Run recovery every 5 minutes
    setInterval(() => {
      this.processRecoveryQueue();
    }, 5 * 60 * 1000);

    logger.info('Recovery service started');
  }

  // Add transaction to recovery queue
  addToRecoveryQueue(transactionId, priority = 'normal') {
    this.recoveryQueue.set(transactionId, {
      priority,
      addedAt: Date.now(),
      attempts: 0
    });

    logger.info('Transaction added to recovery queue', {
      transactionId,
      priority,
      queueSize: this.recoveryQueue.size
    });
  }

  // Process recovery queue
  async processRecoveryQueue() {
    if (this.isProcessing) {
      logger.debug('Recovery process already running, skipping');
      return;
    }

    this.isProcessing = true;
    logger.info('Starting recovery process', { queueSize: this.recoveryQueue.size });

    try {
      // Get stuck transactions from database
      const stuckTransactions = await this.getStuckTransactions();
      
      // Add stuck transactions to queue
      for (const transaction of stuckTransactions) {
        if (!this.recoveryQueue.has(transaction.id)) {
          this.addToRecoveryQueue(transaction.id, 'high');
        }
      }

      // Process queue items
      const sortedQueue = Array.from(this.recoveryQueue.entries())
        .sort(([, a], [, b]) => {
          // Sort by priority (high first) then by age
          if (a.priority === 'high' && b.priority !== 'high') return -1;
          if (a.priority !== 'high' && b.priority === 'high') return 1;
          return a.addedAt - b.addedAt;
        });

      for (const [transactionId, queueItem] of sortedQueue) {
        try {
          const result = await this.recoverTransaction(transactionId);
          
          if (result.success) {
            this.recoveryQueue.delete(transactionId);
            logger.info('Transaction recovered successfully', {
              transactionId,
              result: result.message
            });
          } else {
            queueItem.attempts++;
            if (queueItem.attempts >= 5) {
              // Remove from queue after 5 attempts
              this.recoveryQueue.delete(transactionId);
              logger.warn('Transaction removed from recovery queue after max attempts', {
                transactionId,
                attempts: queueItem.attempts
              });
            }
          }
        } catch (error) {
          logger.error('Error recovering transaction', {
            transactionId,
            error: error.message
          });
        }
      }
    } catch (error) {
      logger.error('Error in recovery process:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Get stuck transactions from database
  async getStuckTransactions() {
    try {
      const cutoffTime = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes ago
      
      const stmt = db.prepare(`
        SELECT * FROM mpesa_transactions 
        WHERE status IN ('pending', 'timeout') 
        AND created_at < ?
        ORDER BY created_at ASC
        LIMIT 50
      `);
      
      return stmt.all(cutoffTime);
    } catch (error) {
      logger.error('Error getting stuck transactions:', error);
      return [];
    }
  }

  // Recover a specific transaction
  async recoverTransaction(transactionId) {
    try {
      const transaction = Transaction.findById(transactionId);
      if (!transaction) {
        return { success: false, message: 'Transaction not found' };
      }

      logger.info('Attempting transaction recovery', {
        transactionId,
        status: transaction.status,
        createdAt: transaction.created_at
      });

      switch (transaction.status) {
        case 'pending':
          return await this.recoverPendingTransaction(transaction);
        case 'timeout':
          return await this.recoverTimeoutTransaction(transaction);
        case 'completed':
          return await this.ensureBlockchainProcessing(transaction);
        default:
          return { success: true, message: 'No recovery needed' };
      }
    } catch (error) {
      logger.error('Transaction recovery failed', {
        transactionId,
        error: error.message
      });
      return { success: false, message: error.message };
    }
  }

  // Recover pending transactions
  async recoverPendingTransaction(transaction) {
    try {
      if (!transaction.checkout_request_id) {
        // Transaction never got to M-Pesa, mark as failed
        Transaction.updateStatus(transaction.id, 'failed', {
          errorMessage: 'Payment request was not sent to M-Pesa'
        });
        return { success: true, message: 'Marked as failed - no M-Pesa request' };
      }

      // Query M-Pesa for current status
      const statusResult = await mpesaService.querySTKPush(transaction.checkout_request_id);
      
      if (!statusResult.success) {
        logger.warn('Failed to query M-Pesa status during recovery', {
          transactionId: transaction.id,
          error: statusResult.error
        });
        return { success: false, message: 'Could not query M-Pesa status' };
      }

      const resultCode = statusResult.data.ResultCode;
      
      if (resultCode === '0') {
        // Payment completed successfully
        Transaction.updateStatus(transaction.id, 'completed');
        
        // Trigger blockchain processing
        this.triggerBlockchainProcessing(transaction.id);
        
        return { success: true, message: 'Payment completed, blockchain processing triggered' };
      } else if (resultCode === '1032') {
        // User cancelled
        Transaction.updateStatus(transaction.id, 'cancelled', {
          errorMessage: 'Payment cancelled by user'
        });
        return { success: true, message: 'Marked as cancelled' };
      } else if (resultCode === '1037') {
        // Timeout
        Transaction.updateStatus(transaction.id, 'timeout', {
          errorMessage: 'Payment request timed out'
        });
        return { success: true, message: 'Marked as timeout' };
      } else {
        // Other failure
        Transaction.updateStatus(transaction.id, 'failed', {
          errorMessage: statusResult.data.ResultDesc || 'Payment failed'
        });
        return { success: true, message: 'Marked as failed' };
      }
    } catch (error) {
      logger.error('Error recovering pending transaction:', error);
      return { success: false, message: error.message };
    }
  }

  // Recover timeout transactions
  async recoverTimeoutTransaction(transaction) {
    // For timeout transactions, query M-Pesa to see if payment actually went through
    return await this.recoverPendingTransaction(transaction);
  }

  // Ensure blockchain processing for completed M-Pesa payments
  async ensureBlockchainProcessing(transaction) {
    try {
      // Check if blockchain processing is already completed
      const bridgeRecord = await this.getBridgeRecord(transaction.id);
      
      if (bridgeRecord && bridgeRecord.blockchain_status === 'completed') {
        return { success: true, message: 'Blockchain processing already completed' };
      }

      // Check if blockchain processing is in progress
      if (bridgeRecord && bridgeRecord.blockchain_status === 'pending') {
        // Check if it's been pending too long
        const pendingTime = Date.now() - new Date(bridgeRecord.created_at).getTime();
        if (pendingTime < 10 * 60 * 1000) { // Less than 10 minutes
          return { success: true, message: 'Blockchain processing in progress' };
        }
      }

      // Trigger blockchain processing
      this.triggerBlockchainProcessing(transaction.id);
      
      return { success: true, message: 'Blockchain processing triggered' };
    } catch (error) {
      logger.error('Error ensuring blockchain processing:', error);
      return { success: false, message: error.message };
    }
  }

  // Get bridge record for transaction
  async getBridgeRecord(mpesaTransactionId) {
    try {
      const stmt = db.prepare('SELECT * FROM payment_bridge WHERE mpesa_transaction_id = ?');
      return stmt.get(mpesaTransactionId);
    } catch (error) {
      logger.error('Error getting bridge record:', error);
      return null;
    }
  }

  // Trigger blockchain processing (async)
  triggerBlockchainProcessing(transactionId) {
    // Use setTimeout to make it async and non-blocking
    setTimeout(async () => {
      try {
        const bridgeController = await import('../controllers/bridgeController.js');
        const transaction = Transaction.findById(transactionId);
        
        if (transaction && transaction.status === 'completed') {
          await bridgeController.default.processSingleTransaction(transaction);
        }
      } catch (error) {
        logger.error('Error in async blockchain processing:', {
          transactionId,
          error: error.message
        });
      }
    }, 1000); // 1 second delay
  }

  // Manual recovery for specific transaction
  async manualRecovery(transactionId, action) {
    try {
      const transaction = Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      logger.info('Manual recovery initiated', {
        transactionId,
        action,
        currentStatus: transaction.status
      });

      switch (action) {
        case 'retry_mpesa_query':
          return await this.recoverPendingTransaction(transaction);
          
        case 'retry_blockchain':
          if (transaction.status === 'completed') {
            this.triggerBlockchainProcessing(transactionId);
            return { success: true, message: 'Blockchain processing retried' };
          }
          throw new Error('M-Pesa payment not completed');
          
        case 'mark_failed':
          Transaction.updateStatus(transactionId, 'failed', {
            errorMessage: 'Manually marked as failed'
          });
          return { success: true, message: 'Transaction marked as failed' };
          
        case 'force_complete':
          if (transaction.status !== 'completed') {
            Transaction.updateStatus(transactionId, 'completed', {
              mpesaReceiptNumber: 'MANUAL_COMPLETION'
            });
            this.triggerBlockchainProcessing(transactionId);
          }
          return { success: true, message: 'Transaction force completed' };
          
        default:
          throw new Error('Unknown recovery action');
      }
    } catch (error) {
      logger.error('Manual recovery failed:', {
        transactionId,
        action,
        error: error.message
      });
      throw error;
    }
  }

  // Get recovery statistics
  getRecoveryStats() {
    return {
      queueSize: this.recoveryQueue.size,
      isProcessing: this.isProcessing,
      queueItems: Array.from(this.recoveryQueue.entries()).map(([id, item]) => ({
        transactionId: id,
        priority: item.priority,
        attempts: item.attempts,
        addedAt: new Date(item.addedAt).toISOString()
      }))
    };
  }
}

export default new RecoveryService();
