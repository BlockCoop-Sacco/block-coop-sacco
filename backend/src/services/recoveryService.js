import cron from 'node-cron';
import { Op } from 'sequelize';
import { MpesaTransaction } from '../models/MpesaTransaction.js';
import blockchainService from './blockchainService.js';
import { logger } from '../utils/logger.js';

class RecoveryService {
  constructor() {
    this.isRunning = false;
    this.maxRetryAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
    this.retryDelay = parseInt(process.env.RETRY_DELAY || '300000'); // 5 minutes
    this.recoveryEnabled = process.env.RECOVERY_ENABLED === 'true';
    
    if (this.recoveryEnabled) {
      this.startRecoveryScheduler();
    }
  }

  // Start the recovery scheduler
  startRecoveryScheduler() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      if (!this.isRunning) {
        await this.runRecovery();
      }
    });

    // Run every hour for stuck transactions
    cron.schedule('0 * * * *', async () => {
      await this.handleStuckTransactions();
    });

    logger.info('Recovery service scheduler started');
  }

  // Main recovery process
  async runRecovery() {
    if (this.isRunning) {
      logger.debug('Recovery already running, skipping...');
      return;
    }

    this.isRunning = true;
    
    try {
      logger.info('Starting recovery process...');

      // Find completed M-Pesa transactions without blockchain transactions
      const failedTransactions = await this.findFailedTransactions();
      
      if (failedTransactions.length === 0) {
        logger.debug('No transactions requiring recovery');
        return;
      }

      logger.info(`Found ${failedTransactions.length} transactions requiring recovery`);

      for (const transaction of failedTransactions) {
        await this.recoverTransaction(transaction);
        
        // Add delay between recovery attempts to avoid overwhelming the network
        await this.delay(2000);
      }

      logger.info('Recovery process completed');

    } catch (error) {
      logger.error('Recovery process failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Find transactions that need recovery
  async findFailedTransactions() {
    try {
      const cutoffTime = new Date(Date.now() - this.retryDelay);
      
      return await MpesaTransaction.findAll({
        where: {
          status: 'completed', // M-Pesa payment completed
          blockchainTxHash: null, // But no blockchain transaction
          retryCount: {
            [Op.lt]: this.maxRetryAttempts
          },
          [Op.or]: [
            { lastRetryAt: null },
            { lastRetryAt: { [Op.lt]: cutoffTime } }
          ]
        },
        order: [['createdAt', 'ASC']],
        limit: 10 // Process in batches
      });
    } catch (error) {
      logger.error('Failed to find failed transactions:', error);
      return [];
    }
  }

  // Recover a single transaction
  async recoverTransaction(transaction) {
    try {
      logger.info('Attempting to recover transaction:', {
        transactionId: transaction.id,
        retryCount: transaction.retryCount,
        walletAddress: transaction.walletAddress,
        packageId: transaction.packageId
      });

      // Update retry tracking
      await transaction.update({
        retryCount: transaction.retryCount + 1,
        lastRetryAt: new Date()
      });

      // Attempt blockchain purchase
      await blockchainService.executePurchase(transaction);

      logger.info('Transaction recovered successfully:', {
        transactionId: transaction.id,
        retryCount: transaction.retryCount + 1
      });

    } catch (error) {
      logger.error('Failed to recover transaction:', {
        transactionId: transaction.id,
        retryCount: transaction.retryCount,
        error: error.message
      });

      // If max retries reached, mark as permanently failed
      if (transaction.retryCount >= this.maxRetryAttempts) {
        await transaction.update({
          status: 'failed',
          errorMessage: `Recovery failed after ${this.maxRetryAttempts} attempts: ${error.message}`
        });

        logger.error('Transaction marked as permanently failed:', {
          transactionId: transaction.id,
          finalError: error.message
        });
      }
    }
  }

  // Handle transactions that have been stuck for too long
  async handleStuckTransactions() {
    try {
      const stuckCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
      
      const stuckTransactions = await MpesaTransaction.findAll({
        where: {
          status: 'pending',
          createdAt: {
            [Op.lt]: stuckCutoff
          }
        }
      });

      for (const transaction of stuckTransactions) {
        logger.warn('Found stuck transaction:', {
          transactionId: transaction.id,
          age: Date.now() - transaction.createdAt.getTime(),
          status: transaction.status
        });

        await transaction.update({
          status: 'timeout',
          errorMessage: 'Transaction timed out after 24 hours'
        });
      }

      if (stuckTransactions.length > 0) {
        logger.info(`Marked ${stuckTransactions.length} stuck transactions as timed out`);
      }

    } catch (error) {
      logger.error('Failed to handle stuck transactions:', error);
    }
  }

  // Manual recovery for specific transaction
  async recoverSpecificTransaction(transactionId) {
    try {
      const transaction = await MpesaTransaction.findByPk(transactionId);
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'completed') {
        throw new Error('Transaction is not in completed status');
      }

      if (transaction.blockchainTxHash) {
        throw new Error('Transaction already has blockchain transaction');
      }

      await this.recoverTransaction(transaction);
      
      return {
        success: true,
        message: 'Recovery initiated for transaction',
        transactionId
      };

    } catch (error) {
      logger.error('Manual recovery failed:', {
        transactionId,
        error: error.message
      });
      
      throw error;
    }
  }

  // Get recovery statistics
  async getRecoveryStats() {
    try {
      const stats = await MpesaTransaction.findAll({
        attributes: [
          'status',
          [MpesaTransaction.sequelize.fn('COUNT', MpesaTransaction.sequelize.col('id')), 'count'],
          [MpesaTransaction.sequelize.fn('AVG', MpesaTransaction.sequelize.col('retryCount')), 'avgRetries']
        ],
        group: ['status'],
        raw: true
      });

      const pendingRecovery = await MpesaTransaction.count({
        where: {
          status: 'completed',
          blockchainTxHash: null,
          retryCount: {
            [Op.lt]: this.maxRetryAttempts
          }
        }
      });

      const failedPermanently = await MpesaTransaction.count({
        where: {
          status: 'failed',
          retryCount: {
            [Op.gte]: this.maxRetryAttempts
          }
        }
      });

      return {
        statusBreakdown: stats.reduce((acc, item) => {
          acc[item.status] = {
            count: parseInt(item.count),
            avgRetries: parseFloat(item.avgRetries) || 0
          };
          return acc;
        }, {}),
        pendingRecovery,
        failedPermanently,
        recoveryEnabled: this.recoveryEnabled,
        maxRetryAttempts: this.maxRetryAttempts
      };

    } catch (error) {
      logger.error('Failed to get recovery stats:', error);
      throw error;
    }
  }

  // Delay helper
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Stop the recovery service
  stop() {
    this.recoveryEnabled = false;
    logger.info('Recovery service stopped');
  }
}

export default new RecoveryService();
