import { jest } from '@jest/globals';
import errorHandler, { ErrorTypes, RecoveryStrategies } from '../../../src/services/errorHandler.js';

describe('ErrorHandler', () => {
  beforeEach(() => {
    // Clear retry attempts before each test
    errorHandler.retryAttempts.clear();
  });

  describe('categorizeError', () => {
    it('should categorize network errors correctly', () => {
      const networkError = new Error('Network error');
      networkError.code = 'ECONNREFUSED';
      
      const result = errorHandler.categorizeError(networkError);
      
      expect(result.type).toBe(ErrorTypes.NETWORK_ERROR);
      expect(result.recoverable).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategies.RETRY);
      expect(result.retryAfter).toBe(30);
    });

    it('should categorize timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';
      
      const result = errorHandler.categorizeError(timeoutError);
      
      expect(result.type).toBe(ErrorTypes.TIMEOUT_ERROR);
      expect(result.recoverable).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategies.RETRY);
    });

    it('should categorize M-Pesa insufficient funds error', () => {
      const mpesaError = new Error('M-Pesa error');
      mpesaError.response = {
        status: 400,
        data: {
          ResponseCode: '1',
          ResponseDescription: 'Insufficient funds'
        }
      };
      
      const result = errorHandler.categorizeError(mpesaError);
      
      expect(result.type).toBe(ErrorTypes.INSUFFICIENT_FUNDS);
      expect(result.recoverable).toBe(false);
      expect(result.strategy).toBe(RecoveryStrategies.IGNORE);
    });

    it('should categorize M-Pesa user cancellation', () => {
      const mpesaError = new Error('M-Pesa error');
      mpesaError.response = {
        status: 400,
        data: {
          ResponseCode: '1032',
          ResponseDescription: 'Request cancelled by user'
        }
      };
      
      const result = errorHandler.categorizeError(mpesaError);
      
      expect(result.type).toBe(ErrorTypes.USER_CANCELLED);
      expect(result.recoverable).toBe(false);
      expect(result.strategy).toBe(RecoveryStrategies.IGNORE);
    });

    it('should categorize M-Pesa timeout error', () => {
      const mpesaError = new Error('M-Pesa error');
      mpesaError.response = {
        status: 400,
        data: {
          ResponseCode: '1037',
          ResponseDescription: 'STK Push timeout'
        }
      };
      
      const result = errorHandler.categorizeError(mpesaError);
      
      expect(result.type).toBe(ErrorTypes.TIMEOUT_ERROR);
      expect(result.recoverable).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategies.RETRY);
      expect(result.retryAfter).toBe(120);
    });

    it('should categorize validation errors', () => {
      const validationError = new Error('Validation failed');
      validationError.response = { status: 400 };
      
      const result = errorHandler.categorizeError(validationError);
      
      expect(result.type).toBe(ErrorTypes.VALIDATION_ERROR);
      expect(result.recoverable).toBe(false);
      expect(result.strategy).toBe(RecoveryStrategies.IGNORE);
    });

    it('should categorize authentication errors', () => {
      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      
      const result = errorHandler.categorizeError(authError);
      
      expect(result.type).toBe(ErrorTypes.MPESA_API_ERROR);
      expect(result.recoverable).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategies.MANUAL_INTERVENTION);
    });

    it('should categorize server errors', () => {
      const serverError = new Error('Internal server error');
      serverError.response = { status: 500 };
      
      const result = errorHandler.categorizeError(serverError);
      
      expect(result.type).toBe(ErrorTypes.SYSTEM_ERROR);
      expect(result.recoverable).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategies.RETRY);
    });

    it('should handle unknown errors', () => {
      const unknownError = new Error('Unknown error');
      
      const result = errorHandler.categorizeError(unknownError);
      
      expect(result.type).toBe(ErrorTypes.SYSTEM_ERROR);
      expect(result.recoverable).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategies.RETRY);
    });
  });

  describe('handleMpesaError', () => {
    it('should handle and log M-Pesa errors', () => {
      const error = new Error('M-Pesa API error');
      error.response = {
        status: 400,
        data: {
          ResponseCode: '1',
          ResponseDescription: 'Insufficient funds'
        }
      };
      
      const context = { transactionId: 'test-123' };
      const result = errorHandler.handleMpesaError(error, context);
      
      expect(result.type).toBe(ErrorTypes.INSUFFICIENT_FUNDS);
      expect(result.message).toContain('Insufficient funds');
      expect(result.recoverable).toBe(false);
    });
  });

  describe('handleBlockchainError', () => {
    it('should handle blockchain insufficient gas error', () => {
      const error = new Error('insufficient funds for gas');
      const context = { operation: 'purchase' };
      
      const result = errorHandler.handleBlockchainError(error, context);
      
      expect(result.type).toBe(ErrorTypes.BLOCKCHAIN_ERROR);
      expect(result.code).toBe('INSUFFICIENT_GAS');
      expect(result.strategy).toBe(RecoveryStrategies.MANUAL_INTERVENTION);
    });

    it('should handle blockchain nonce error', () => {
      const error = new Error('nonce too low');
      const context = { operation: 'purchase' };
      
      const result = errorHandler.handleBlockchainError(error, context);
      
      expect(result.type).toBe(ErrorTypes.BLOCKCHAIN_ERROR);
      expect(result.code).toBe('NONCE_ERROR');
      expect(result.recoverable).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategies.RETRY);
    });

    it('should handle contract revert error', () => {
      const error = new Error('execution reverted');
      const context = { operation: 'purchase' };
      
      const result = errorHandler.handleBlockchainError(error, context);
      
      expect(result.type).toBe(ErrorTypes.BLOCKCHAIN_ERROR);
      expect(result.code).toBe('CONTRACT_REVERT');
      expect(result.strategy).toBe(RecoveryStrategies.MANUAL_INTERVENTION);
    });
  });

  describe('retryOperation', () => {
    it('should retry operation with exponential backoff', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Operation failed');
        }
        return 'success';
      });
      
      const result = await errorHandler.retryOperation('test-op', operation, 3);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(
        errorHandler.retryOperation('test-op', operation, 2)
      ).rejects.toThrow('Maximum retry attempts exceeded');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should clear retry attempts on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      await errorHandler.retryOperation('test-op', operation);
      
      expect(errorHandler.retryAttempts.has('test-op')).toBe(false);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return appropriate message for network error', () => {
      const message = errorHandler.getUserFriendlyMessage(ErrorTypes.NETWORK_ERROR);
      expect(message).toContain('Connection failed');
    });

    it('should return appropriate message for timeout error', () => {
      const message = errorHandler.getUserFriendlyMessage(ErrorTypes.TIMEOUT_ERROR);
      expect(message).toContain('timed out');
    });

    it('should return appropriate message for insufficient funds', () => {
      const message = errorHandler.getUserFriendlyMessage(ErrorTypes.INSUFFICIENT_FUNDS);
      expect(message).toContain('Insufficient M-Pesa balance');
    });

    it('should return appropriate message for blockchain error', () => {
      const message = errorHandler.getUserFriendlyMessage(ErrorTypes.BLOCKCHAIN_ERROR);
      expect(message).toContain('payment was successful');
      expect(message).toContain('process it shortly');
    });

    it('should return default message for unknown error type', () => {
      const message = errorHandler.getUserFriendlyMessage('UNKNOWN_ERROR_TYPE');
      expect(message).toContain('unexpected error');
    });
  });
});
