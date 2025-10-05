import express from 'express';
import { body, param, query } from 'express-validator';
import mpesaService from '../services/mpesaService.js';
import blockchainService from '../services/blockchainService.js';
import recoveryService from '../services/recoveryService.js';
import { MpesaTransaction } from '../models/MpesaTransaction.js';
import { walletRateLimit } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Initiate M-Pesa payment
router.post('/initiate-payment',
  walletRateLimit(3, 60000), // 3 requests per minute per wallet
  [
    body('walletAddress')
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Invalid wallet address format'),
    body('packageId')
      .isInt({ min: 0 })
      .withMessage('Package ID must be a non-negative integer'),
    body('phoneNumber')
      .matches(/^254[0-9]{9}$/)
      .withMessage('Phone number must be in Kenyan format (254XXXXXXXXX)'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be at least 0.01 USD'),
    body('referrerAddress')
      .optional()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Invalid referrer address format')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    try {
      const result = await mpesaService.initiateSTKPush(req.body);

      logger.info('Payment initiated successfully:', {
        transactionId: result.transactionId,
        walletAddress: req.body.walletAddress,
        amount: req.body.amount
      });

      res.json(result);
    } catch (error) {
      logger.error('Payment initiation failed:', error);

      res.status(400).json({
        success: false,
        error: error.message,
        errorType: 'MPESA_API_ERROR'
      });
    }
  })
);

// Query payment status
router.get('/status/:checkoutRequestId',
  [
    param('checkoutRequestId')
      .isLength({ min: 10, max: 50 })
      .withMessage('Invalid checkout request ID')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const result = await mpesaService.querySTKPushStatus(req.params.checkoutRequestId);
    res.json(result);
  })
);

// Get transaction history for a wallet
router.get('/transactions/:walletAddress',
  [
    param('walletAddress')
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Invalid wallet address format'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const result = await MpesaTransaction.findByWalletAddress(walletAddress, limit, offset);
      const stats = await MpesaTransaction.getStats(walletAddress);

      res.json({
        success: true,
        transactions: result.rows,
        pagination: {
          total: result.count,
          limit,
          offset,
          hasMore: offset + limit < result.count
        },
        stats: stats[0] || {
          totalTransactions: 0,
          completedTransactions: 0,
          failedTransactions: 0,
          pendingTransactions: 0,
          totalAmountUsd: 0,
          totalAmountKes: 0
        }
      });
    } catch (error) {
      logger.error('Transaction history query failed:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve transaction history',
        errorType: 'SYSTEM_ERROR'
      });
    }
  }
);

// M-Pesa callback endpoint
router.post('/callback', asyncHandler(async (req, res) => {
  logger.info('M-Pesa callback received:', req.body);

  const { Body } = req.body;
  if (!Body || !Body.stkCallback) {
    // Be lenient for provider validation pings
    return res.json({ ResultCode: 0, ResultDesc: 'OK' });
  }

  const callback = Body.stkCallback;
  const { CheckoutRequestID, ResultCode, ResultDesc } = callback;

  // Find transaction by checkout request ID
  const transaction = await MpesaTransaction.findByCheckoutRequestId(CheckoutRequestID);
  if (!transaction) {
    logger.warn('Transaction not found for callback:', CheckoutRequestID);
    // Acknowledge to provider regardless
    return res.json({ ResultCode: 0, ResultDesc: 'OK' });
  }

  // Process callback based on result code
  if (ResultCode === 0) {
    // Payment successful
    const callbackMetadata = callback.CallbackMetadata?.Item || [];
    const mpesaReceiptNumber = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;

    await transaction.markAsCompleted(mpesaReceiptNumber, req.body);

    logger.info('Payment completed:', {
      transactionId: transaction.id,
      mpesaReceiptNumber,
      amount: transaction.amountKes
    });

    // Idempotency: prevent duplicate on-chain purchases from duplicate callbacks
    try {
      // If already processed, acknowledge and skip
      if (transaction.blockchainTxHash) {
        logger.info('Duplicate callback: blockchain transaction already exists for this M-Pesa transaction', {
          transactionId: transaction.id,
          blockchainTxHash: transaction.blockchainTxHash
        });
        return res.json({ ResultCode: 0, ResultDesc: 'OK' });
      }

      // Try to acquire processing lock atomically
      const [updated] = await MpesaTransaction.update(
        { blockchainProcessing: true },
        { where: { id: transaction.id, blockchainProcessing: false, blockchainTxHash: null } }
      );

      if (updated === 0) {
        logger.info('Purchase already in progress or completed, skipping duplicate processing', {
          transactionId: transaction.id
        });
        return res.json({ ResultCode: 0, ResultDesc: 'OK' });
      }

      logger.info('Initiating blockchain purchase for completed M-Pesa payment:', {
        transactionId: transaction.id,
        walletAddress: transaction.walletAddress,
        packageId: transaction.packageId
      });

      await blockchainService.executePurchase(transaction);

      logger.info('Blockchain purchase completed successfully:', {
        transactionId: transaction.id
      });
    } catch (blockchainError) {
      logger.error('Blockchain purchase failed after successful M-Pesa payment:', {
        transactionId: transaction.id,
        error: blockchainError.message
      });
      // Don't fail the callback - the M-Pesa payment was successful
      // The blockchain transaction will be retried by the recovery system
    } finally {
      // Clear processing flag regardless; blockchainService updates hash/status on success
      try {
        await transaction.update({ blockchainProcessing: false });
      } catch {}
    }

  } else {
    // Payment failed
    await transaction.markAsFailed(ResultDesc, ResultCode, ResultDesc);

    logger.warn('Payment failed:', {
      transactionId: transaction.id,
      resultCode: ResultCode,
      resultDesc: ResultDesc
    });
  }

  res.json({ ResultCode: 0, ResultDesc: 'OK' });
}));

// Callback validation endpoints (Safaricom may ping via GET/HEAD)
router.get('/callback', (req, res) => {
  res.json({ success: true, message: 'Callback endpoint is reachable (GET)' });
});
router.head('/callback', (req, res) => {
  res.status(200).end();
});

// Timeout callback endpoint (Daraja can be configured to call this)
router.post('/timeout', asyncHandler(async (req, res) => {
  logger.warn('M-Pesa timeout callback received:', req.body);
  res.json({ success: true });
}));

// Timeout validation endpoints
router.get('/timeout', (req, res) => {
  res.json({ success: true, message: 'Timeout endpoint is reachable (GET)' });
});
router.head('/timeout', (req, res) => {
  res.status(200).end();
});


// Recovery endpoints
router.post('/recover/:transactionId',
  [
    param('transactionId')
      .isUUID()
      .withMessage('Invalid transaction ID format')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const result = await recoveryService.recoverSpecificTransaction(req.params.transactionId);
    res.json(result);
  })
);

router.get('/recovery-stats',
  asyncHandler(async (req, res) => {
    const stats = await recoveryService.getRecoveryStats();
    res.json({
      success: true,
      stats
    });
  })
);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'M-Pesa Integration',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});


export default router;
