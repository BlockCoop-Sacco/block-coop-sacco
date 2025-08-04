import logger from '../config/logger.js';
import { Transaction } from '../models/Transaction.js';

// Error types for M-Pesa integration
export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MPESA_API_ERROR: 'MPESA_API_ERROR',
  BLOCKCHAIN_ERROR: 'BLOCKCHAIN_ERROR',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  USER_CANCELLED: 'USER_CANCELLED',
  DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
};

// Error recovery strategies
export const RecoveryStrategies = {
  RETRY: 'RETRY',
  MANUAL_INTERVENTION: 'MANUAL_INTERVENTION',
  REFUND: 'REFUND',
  IGNORE: 'IGNORE'
};

class ErrorHandler {
  constructor() {
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  // Handle M-Pesa API errors
  handleMpesaError(error, context = {}) {
    const errorInfo = this.categorizeError(error);
    
    logger.error('M-Pesa API Error', {
      ...errorInfo,
      context,
      timestamp: new Date().toISOString()
    });

    return {
      type: errorInfo.type,
      message: errorInfo.userMessage,
      code: errorInfo.code,
      recoverable: errorInfo.recoverable,
      retryAfter: errorInfo.retryAfter
    };
  }

  // Categorize errors and determine recovery strategy
  categorizeError(error) {
    const errorString = error.message || error.toString().toLowerCase();
    const statusCode = error.response?.status;
    const responseData = error.response?.data;

    // Network and timeout errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return {
        type: ErrorTypes.NETWORK_ERROR,
        code: error.code,
        userMessage: 'Network connection failed. Please check your internet connection and try again.',
        recoverable: true,
        retryAfter: 30,
        strategy: RecoveryStrategies.RETRY
      };
    }

    // Timeout errors
    if (errorString.includes('timeout') || statusCode === 408) {
      return {
        type: ErrorTypes.TIMEOUT_ERROR,
        code: 'TIMEOUT',
        userMessage: 'Request timed out. Please try again.',
        recoverable: true,
        retryAfter: 60,
        strategy: RecoveryStrategies.RETRY
      };
    }

    // M-Pesa specific errors
    if (responseData) {
      const mpesaErrorCode = responseData.ResponseCode || responseData.errorCode;
      const mpesaErrorDesc = responseData.ResponseDescription || responseData.errorMessage;

      switch (mpesaErrorCode) {
        case '1':
          return {
            type: ErrorTypes.INSUFFICIENT_FUNDS,
            code: 'INSUFFICIENT_FUNDS',
            userMessage: 'Insufficient funds in your M-Pesa account. Please top up and try again.',
            recoverable: false,
            strategy: RecoveryStrategies.IGNORE
          };

        case '1032':
          return {
            type: ErrorTypes.USER_CANCELLED,
            code: 'USER_CANCELLED',
            userMessage: 'Payment was cancelled by user.',
            recoverable: false,
            strategy: RecoveryStrategies.IGNORE
          };

        case '1037':
          return {
            type: ErrorTypes.TIMEOUT_ERROR,
            code: 'MPESA_TIMEOUT',
            userMessage: 'Payment request timed out. Please try again.',
            recoverable: true,
            retryAfter: 120,
            strategy: RecoveryStrategies.RETRY
          };

        case '2001':
          return {
            type: ErrorTypes.VALIDATION_ERROR,
            code: 'INVALID_INITIATOR',
            userMessage: 'Payment service temporarily unavailable. Please try again later.',
            recoverable: true,
            retryAfter: 300,
            strategy: RecoveryStrategies.MANUAL_INTERVENTION
          };

        default:
          return {
            type: ErrorTypes.MPESA_API_ERROR,
            code: mpesaErrorCode || 'UNKNOWN_MPESA_ERROR',
            userMessage: mpesaErrorDesc || 'Payment failed. Please try again.',
            recoverable: true,
            retryAfter: 60,
            strategy: RecoveryStrategies.RETRY
          };
      }
    }

    // Validation errors
    if (statusCode === 400 || errorString.includes('validation')) {
      return {
        type: ErrorTypes.VALIDATION_ERROR,
        code: 'VALIDATION_FAILED',
        userMessage: 'Invalid payment details. Please check your information and try again.',
        recoverable: false,
        strategy: RecoveryStrategies.IGNORE
      };
    }

    // Authentication errors
    if (statusCode === 401 || statusCode === 403) {
      return {
        type: ErrorTypes.MPESA_API_ERROR,
        code: 'AUTH_FAILED',
        userMessage: 'Payment service temporarily unavailable. Please try again later.',
        recoverable: true,
        retryAfter: 300,
        strategy: RecoveryStrategies.MANUAL_INTERVENTION
      };
    }

    // Server errors
    if (statusCode >= 500) {
      return {
        type: ErrorTypes.SYSTEM_ERROR,
        code: 'SERVER_ERROR',
        userMessage: 'Payment service temporarily unavailable. Please try again later.',
        recoverable: true,
        retryAfter: 120,
        strategy: RecoveryStrategies.RETRY
      };
    }

    // Default error
    return {
      type: ErrorTypes.SYSTEM_ERROR,
      code: 'UNKNOWN_ERROR',
      userMessage: 'An unexpected error occurred. Please try again.',
      recoverable: true,
      retryAfter: 60,
      strategy: RecoveryStrategies.RETRY
    };
  }

  // Handle blockchain errors
  handleBlockchainError(error, context = {}) {
    const errorString = error.message || error.toString().toLowerCase();
    
    let errorInfo = {
      type: ErrorTypes.BLOCKCHAIN_ERROR,
      code: 'BLOCKCHAIN_ERROR',
      userMessage: 'Blockchain transaction failed. Your M-Pesa payment was successful, and we will process your package manually.',
      recoverable: true,
      strategy: RecoveryStrategies.MANUAL_INTERVENTION
    };

    // Specific blockchain error handling
    if (errorString.includes('insufficient funds')) {
      errorInfo = {
        ...errorInfo,
        code: 'INSUFFICIENT_GAS',
        userMessage: 'Blockchain processing failed due to insufficient gas. Your payment will be processed manually.'
      };
    } else if (errorString.includes('nonce')) {
      errorInfo = {
        ...errorInfo,
        code: 'NONCE_ERROR',
        recoverable: true,
        strategy: RecoveryStrategies.RETRY
      };
    } else if (errorString.includes('revert')) {
      errorInfo = {
        ...errorInfo,
        code: 'CONTRACT_REVERT',
        userMessage: 'Smart contract execution failed. Your payment will be processed manually.'
      };
    }

    logger.error('Blockchain Error', {
      ...errorInfo,
      context,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    return errorInfo;
  }

  // Retry mechanism with exponential backoff
  async retryOperation(operationId, operation, maxRetries = this.maxRetries) {
    const attempts = this.retryAttempts.get(operationId) || 0;
    
    if (attempts >= maxRetries) {
      logger.error('Max retry attempts reached', { operationId, attempts });
      throw new Error('Maximum retry attempts exceeded');
    }

    try {
      const result = await operation();
      this.retryAttempts.delete(operationId);
      return result;
    } catch (error) {
      const newAttempts = attempts + 1;
      this.retryAttempts.set(operationId, newAttempts);
      
      const delay = this.retryDelay * Math.pow(2, attempts); // Exponential backoff
      
      logger.warn('Operation failed, retrying', {
        operationId,
        attempt: newAttempts,
        maxRetries,
        retryAfter: delay,
        error: error.message
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryOperation(operationId, operation, maxRetries);
    }
  }

  // Handle transaction recovery
  async recoverTransaction(transactionId) {
    try {
      const transaction = Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      logger.info('Starting transaction recovery', {
        transactionId,
        status: transaction.status,
        amount: transaction.amount
      });

      // Determine recovery action based on transaction state
      switch (transaction.status) {
        case 'pending':
          return await this.recoverPendingTransaction(transaction);
        case 'failed':
          return await this.recoverFailedTransaction(transaction);
        case 'timeout':
          return await this.recoverTimeoutTransaction(transaction);
        default:
          logger.warn('No recovery needed for transaction', {
            transactionId,
            status: transaction.status
          });
          return { success: true, message: 'No recovery needed' };
      }
    } catch (error) {
      logger.error('Transaction recovery failed', {
        transactionId,
        error: error.message
      });
      throw error;
    }
  }

  // Recover pending transactions
  async recoverPendingTransaction(transaction) {
    // Query M-Pesa for current status
    try {
      const mpesaService = await import('./mpesaService.js');
      const statusResult = await mpesaService.default.querySTKPush(transaction.checkout_request_id);
      
      if (statusResult.success) {
        const resultCode = statusResult.data.ResultCode;
        
        if (resultCode === '0') {
          // Payment completed
          Transaction.updateStatus(transaction.id, 'completed');
          return { success: true, message: 'Transaction recovered as completed' };
        } else if (resultCode === '1032') {
          // User cancelled
          Transaction.updateStatus(transaction.id, 'cancelled');
          return { success: true, message: 'Transaction marked as cancelled' };
        } else {
          // Failed
          Transaction.updateStatus(transaction.id, 'failed', {
            errorMessage: statusResult.data.ResultDesc
          });
          return { success: true, message: 'Transaction marked as failed' };
        }
      }
      
      return { success: false, message: 'Could not determine transaction status' };
    } catch (error) {
      logger.error('Error recovering pending transaction', error);
      return { success: false, message: 'Recovery failed' };
    }
  }

  // Recover failed transactions
  async recoverFailedTransaction(transaction) {
    // Check if this was a temporary failure that can be retried
    const errorMessage = transaction.error_message || '';
    
    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      // Attempt to query status again
      return await this.recoverPendingTransaction(transaction);
    }
    
    return { success: true, message: 'Failed transaction confirmed' };
  }

  // Recover timeout transactions
  async recoverTimeoutTransaction(transaction) {
    // Query M-Pesa to see if payment actually went through
    return await this.recoverPendingTransaction(transaction);
  }

  // Generate user-friendly error messages
  getUserFriendlyMessage(errorType, context = {}) {
    const messages = {
      [ErrorTypes.NETWORK_ERROR]: 'Connection failed. Please check your internet and try again.',
      [ErrorTypes.TIMEOUT_ERROR]: 'Request timed out. Please try again in a few moments.',
      [ErrorTypes.VALIDATION_ERROR]: 'Please check your payment details and try again.',
      [ErrorTypes.MPESA_API_ERROR]: 'M-Pesa service is temporarily unavailable. Please try again later.',
      [ErrorTypes.BLOCKCHAIN_ERROR]: 'Your payment was successful, but package processing is delayed. We will complete it shortly.',
      [ErrorTypes.INSUFFICIENT_FUNDS]: 'Insufficient M-Pesa balance. Please top up your account and try again.',
      [ErrorTypes.USER_CANCELLED]: 'Payment was cancelled.',
      [ErrorTypes.DUPLICATE_TRANSACTION]: 'This payment has already been processed.',
      [ErrorTypes.SYSTEM_ERROR]: 'System temporarily unavailable. Please try again later.'
    };

    return messages[errorType] || 'An unexpected error occurred. Please try again.';
  }
}

export default new ErrorHandler();
