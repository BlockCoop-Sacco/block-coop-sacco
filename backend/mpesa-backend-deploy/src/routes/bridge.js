import express from 'express';
import bridgeController from '../controllers/bridgeController.js';
import {
  createRateLimit,
  validateApiKey,
  logRequest
} from '../middleware/auth.js';

const router = express.Router();

// Apply rate limiting
router.use(createRateLimit(15 * 60 * 1000, 30)); // 30 requests per 15 minutes

// Apply request logging
router.use(logRequest);

// Process completed M-Pesa payments (can be called by cron job or webhook)
router.post('/process-payments', validateApiKey, (req, res) => bridgeController.processCompletedPayments(req, res));

// Complete purchase after M-Pesa payment
router.post('/complete-purchase', (req, res) => bridgeController.completePurchase(req, res));

// Get bridge status for a transaction
router.get('/status/:transactionId', (req, res) => bridgeController.getBridgeStatus(req, res));

// Manual retry for failed transactions
router.post('/retry/:transactionId', validateApiKey, (req, res) => bridgeController.retryTransaction(req, res));

export default router;
