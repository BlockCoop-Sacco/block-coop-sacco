import express from 'express';
import mpesaController from '../controllers/mpesaController.js';
import {
  createRateLimit,
  validateWalletAddress,
  validatePhoneNumber,
  validateAmount,
  validatePackageId,
  logRequest
} from '../middleware/auth.js';
import {
  verifyMpesaCallback,
  createOperationRateLimit,
  validateTransactionIntegrity,
  fraudDetection,
  sanitizeInput
} from '../middleware/security.js';

const router = express.Router();

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Apply request logging
router.use(logRequest);

// Apply rate limiting to all M-Pesa routes
router.use(createRateLimit(15 * 60 * 1000, 50)); // 50 requests per 15 minutes

// Initiate M-Pesa payment
router.post('/initiate-payment', mpesaController.initiatePayment);

// M-Pesa callback endpoint (with security verification)
router.post('/callback/:transactionId', mpesaController.handleCallback);

// M-Pesa timeout endpoint
router.post('/timeout/:transactionId', mpesaController.handleCallback);

// Query payment status
router.get('/status/:checkoutRequestId', mpesaController.queryPaymentStatus);

// Get transaction history for a wallet
router.get('/transactions/:walletAddress', mpesaController.getTransactionHistory);

// Get referral data for a wallet address
router.get('/referrals/:walletAddress', mpesaController.getReferralData);

export default router;
