import express from 'express';
import recoveryService from '../services/recoveryService.js';
import errorHandler from '../services/errorHandler.js';
import {
  createRateLimit,
  validateApiKey,
  logRequest
} from '../middleware/auth.js';
import {
  validateTransactionIntegrity,
  sanitizeInput
} from '../middleware/security.js';

const router = express.Router();

// Apply input sanitization
router.use(sanitizeInput);

// Apply request logging
router.use(logRequest);

// Apply rate limiting
router.use(createRateLimit(15 * 60 * 1000, 20)); // 20 requests per 15 minutes

// Manual recovery for specific transaction
router.post('/manual/:transactionId', [
  validateApiKey,
  validateTransactionIntegrity
], async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Recovery action is required'
      });
    }

    const validActions = [
      'retry_mpesa_query',
      'retry_blockchain',
      'mark_failed',
      'force_complete'
    ];

    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recovery action',
        validActions
      });
    }

    const result = await recoveryService.manualRecovery(transactionId, action);

    res.json({
      success: true,
      transactionId,
      action,
      result: result.message
    });
  } catch (error) {
    const errorInfo = errorHandler.handleMpesaError(error, {
      operation: 'manual_recovery',
      transactionId: req.params.transactionId,
      action: req.body.action
    });

    res.status(500).json({
      success: false,
      error: errorInfo.message,
      errorType: errorInfo.type
    });
  }
});

// Recover specific transaction
router.post('/recover/:transactionId', [
  validateTransactionIntegrity
], async (req, res) => {
  try {
    const { transactionId } = req.params;
    const result = await recoveryService.recoverTransaction(transactionId);

    res.json({
      success: result.success,
      transactionId,
      message: result.message
    });
  } catch (error) {
    const errorInfo = errorHandler.handleMpesaError(error, {
      operation: 'recover_transaction',
      transactionId: req.params.transactionId
    });

    res.status(500).json({
      success: false,
      error: errorInfo.message,
      errorType: errorInfo.type
    });
  }
});

// Add transaction to recovery queue
router.post('/queue/:transactionId', [
  validateApiKey,
  validateTransactionIntegrity
], async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { priority = 'normal' } = req.body;

    recoveryService.addToRecoveryQueue(transactionId, priority);

    res.json({
      success: true,
      transactionId,
      message: 'Transaction added to recovery queue',
      priority
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add transaction to recovery queue'
    });
  }
});

// Get recovery statistics
router.get('/stats', validateApiKey, async (req, res) => {
  try {
    const stats = recoveryService.getRecoveryStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get recovery statistics'
    });
  }
});

// Trigger recovery process manually
router.post('/process', validateApiKey, async (req, res) => {
  try {
    // Don't await this as it can take time
    recoveryService.processRecoveryQueue();
    
    res.json({
      success: true,
      message: 'Recovery process triggered'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to trigger recovery process'
    });
  }
});

// Health check for recovery service
router.get('/health', async (req, res) => {
  try {
    const stats = recoveryService.getRecoveryStats();
    
    res.json({
      success: true,
      status: 'healthy',
      queueSize: stats.queueSize,
      isProcessing: stats.isProcessing,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
