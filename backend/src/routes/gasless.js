import express from 'express';
import { body, validationResult } from 'express-validator';
import gaslessRelayer from '../services/gaslessRelayer.js';
import { GaslessTransaction } from '../models/GaslessTransaction.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * @route POST /api/gasless/relay
 * @desc Relay a gasless transaction
 * @access Public
 */
router.post('/relay', [
  body('from').isEthereumAddress().withMessage('Invalid from address'),
  body('to').isEthereumAddress().withMessage('Invalid to address'),
  body('value').optional().isNumeric().withMessage('Value must be numeric'),
  body('gas').optional().isNumeric().withMessage('Gas must be numeric'),
  body('nonce').isNumeric().withMessage('Nonce must be numeric'),
  body('data').isHexColor().withMessage('Data must be hex string'),
  body('validUntil').optional().isNumeric().withMessage('ValidUntil must be numeric'),
  body('signature').isHexColor().withMessage('Signature must be hex string')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const transactionData = req.body;

    // Relay the transaction
    const result = await gaslessRelayer.relayTransaction(transactionData);

    res.json({
      success: true,
      message: 'Transaction relayed successfully',
      data: result
    });

  } catch (error) {
    logger.error('Failed to relay transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to relay transaction',
      error: error.message
    });
  }
});

/**
 * @route POST /api/gasless/purchase
 * @desc Relay a gasless package purchase
 * @access Public
 */
router.post('/purchase', [
  body('userWalletAddress').isEthereumAddress().withMessage('Invalid wallet address'),
  body('packageId').isInt({ min: 1 }).withMessage('Package ID must be a positive integer'),
  body('usdtAmount').isNumeric().withMessage('USDT amount must be numeric'),
  body('referrer').optional().isEthereumAddress().withMessage('Invalid referrer address'),
  body('deadline').isNumeric().withMessage('Deadline must be numeric'),
  body('signature').isHexColor().withMessage('Signature must be hex string')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const purchaseData = req.body;

    // Check if request has expired
    if (purchaseData.deadline <= Math.floor(Date.now() / 1000)) {
      return res.status(400).json({
        success: false,
        message: 'Purchase request has expired'
      });
    }

    // Relay the purchase
    const result = await gaslessRelayer.relayPackagePurchase(purchaseData);

    res.json({
      success: true,
      message: 'Package purchase relayed successfully',
      data: result
    });

  } catch (error) {
    logger.error('Failed to relay package purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to relay package purchase',
      error: error.message
    });
  }
});

/**
 * @route GET /api/gasless/status
 * @desc Get relayer status
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    const status = await gaslessRelayer.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get relayer status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get relayer status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/gasless/transactions
 * @desc Get gasless transactions for a user
 * @access Public
 */
router.get('/transactions/:userAddress', [
  body('userAddress').isEthereumAddress().withMessage('Invalid wallet address')
], async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    if (status) {
      options.where = { status };
    }

    const transactions = await GaslessTransaction.findByUser(userAddress, options);
    const total = await GaslessTransaction.count({ where: { userWalletAddress: userAddress } });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get user transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user transactions',
      error: error.message
    });
  }
});

/**
 * @route GET /api/gasless/transaction/:hash
 * @desc Get gasless transaction by hash
 * @access Public
 */
router.get('/transaction/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    const transaction = await GaslessTransaction.findByTransactionHash(hash);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    logger.error('Failed to get transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction',
      error: error.message
    });
  }
});

/**
 * @route POST /api/gasless/retry/:id
 * @desc Retry a failed gasless transaction
 * @access Public
 */
router.post('/retry/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await GaslessTransaction.findByPk(id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (!transaction.canBeRetried()) {
      return res.status(400).json({
        success: false,
        message: 'Transaction cannot be retried'
      });
    }

    // Create new transaction data for retry
    const retryData = {
      userWalletAddress: transaction.userWalletAddress,
      packageId: transaction.packageId,
      usdtAmount: transaction.usdtAmount,
      referrer: transaction.referrer,
      deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
      signature: transaction.signature
    };

    // Attempt to relay the transaction again
    const result = await gaslessRelayer.relayPackagePurchase(retryData);

    res.json({
      success: true,
      message: 'Transaction retry initiated',
      data: result
    });

  } catch (error) {
    logger.error('Failed to retry transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry transaction',
      error: error.message
    });
  }
});

/**
 * @route GET /api/gasless/stats
 * @desc Get gasless transaction statistics
 * @access Public
 */
router.get('/stats', async (req, res) => {
  try {
    const [total, pending, success, failed, expired] = await Promise.all([
      GaslessTransaction.count(),
      GaslessTransaction.count({ where: { status: 'pending' } }),
      GaslessTransaction.count({ where: { status: 'success' } }),
      GaslessTransaction.count({ where: { status: 'failed' } }),
      GaslessTransaction.count({ where: { status: 'expired' } })
    ]);

    const stats = {
      total,
      pending,
      success,
      failed,
      expired,
      successRate: total > 0 ? ((success / total) * 100).toFixed(2) : 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get transaction stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction stats',
      error: error.message
    });
  }
});

export default router;








