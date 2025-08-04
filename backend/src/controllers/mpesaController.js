import mpesaService from '../services/mpesaService.js';
import { Transaction, PaymentBridge } from '../models/Transaction.js';
import logger from '../config/logger.js';
import errorHandler from '../services/errorHandler.js';

// Exchange rate configuration (should be fetched from external API in production)
const KES_TO_USD_RATE = parseFloat(process.env.KES_TO_USD_RATE) || 0.0067;
const USD_TO_KES_RATE = parseFloat(process.env.USD_TO_KES_RATE) || 149.25;

class MpesaController {
  // Initiate M-Pesa payment
  async initiatePayment(req, res) {
    // Extract variables outside try block for error handling
    const {
      walletAddress,
      packageId,
      phoneNumber,
      amount, // USD amount
      referrerAddress
    } = req.body;

    try {

      // Convert USD to KES
      const kesAmount = Math.round(amount * USD_TO_KES_RATE);
      
      // Validate minimum amount (KES 1)
      if (kesAmount < 1) {
        return res.status(400).json({
          success: false,
          error: 'Amount too small. Minimum payment is KES 1.'
        });
      }

      // Create transaction record
      const transaction = await Transaction.create({
        userWalletAddress: walletAddress,
        packageId: parseInt(packageId),
        phoneNumber,
        amount: parseFloat(amount),
        kesAmount
      });

      // Generate callback URL with transaction ID
      const callbackUrl = `${process.env.CALLBACK_BASE_URL}/api/mpesa/callback/${transaction.id}`;
      
      // Initiate STK Push
      const stkResult = await mpesaService.initiateSTKPush(
        phoneNumber,
        kesAmount,
        `Package-${packageId}`,
        `USDT Package Purchase - ${amount} USD`,
        callbackUrl
      );

      if (stkResult.success) {
        // Update transaction with M-Pesa details
        logger.info('Updating transaction status', {
          transactionId: transaction.id,
          status: 'pending',
          checkoutRequestId: stkResult.checkoutRequestId,
          merchantRequestId: stkResult.merchantRequestId
        });

        const updatedTransaction = Transaction.updateStatus(transaction.id, 'pending', {
          checkoutRequestId: stkResult.checkoutRequestId,
          merchantRequestId: stkResult.merchantRequestId
        });

        logger.info('M-Pesa payment initiated successfully', {
          transactionId: transaction.id,
          checkoutRequestId: stkResult.checkoutRequestId,
          phoneNumber,
          amount,
          kesAmount
        });

        res.json({
          success: true,
          transactionId: transaction.id,
          checkoutRequestId: stkResult.checkoutRequestId,
          message: 'Payment request sent to your phone. Please enter your M-Pesa PIN to complete the transaction.',
          amount: {
            usd: amount,
            kes: kesAmount
          }
        });
      } else {
        // Handle error with error handler
        const errorInfo = errorHandler.handleMpesaError(new Error(stkResult.error), {
          transactionId: transaction.id,
          phoneNumber,
          amount
        });

        // Update transaction status to failed
        Transaction.updateStatus(transaction.id, 'failed', {
          errorMessage: stkResult.error
        });

        logger.error('Failed to initiate M-Pesa payment', {
          transactionId: transaction.id,
          error: stkResult.error,
          errorType: errorInfo.type
        });

        res.status(400).json({
          success: false,
          error: errorInfo.message,
          errorType: errorInfo.type,
          recoverable: errorInfo.recoverable,
          retryAfter: errorInfo.retryAfter
        });
      }
    } catch (error) {
      const errorInfo = errorHandler.handleMpesaError(error, {
        operation: 'initiatePayment',
        walletAddress,
        packageId,
        phoneNumber,
        amount
      });

      logger.error('Error in initiatePayment:', {
        error: error.message,
        errorType: errorInfo.type,
        walletAddress,
        packageId
      });

      res.status(500).json({
        success: false,
        error: errorInfo.message,
        errorType: errorInfo.type,
        recoverable: errorInfo.recoverable
      });
    }
  }

  // Handle M-Pesa callback
  async handleCallback(req, res) {
    try {
      const { transactionId } = req.params;
      const callbackData = req.body;

      logger.info('M-Pesa callback received', {
        transactionId,
        callbackData
      });

      // Find the transaction
      const transaction = Transaction.findById(transactionId);
      if (!transaction) {
        logger.error('Transaction not found for callback', { transactionId });
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Parse callback data
      const parsedData = mpesaService.parseCallbackData(callbackData);
      
      // Update transaction based on result
      if (parsedData.resultCode === 0) {
        // Payment successful
        const updatedTransaction = Transaction.updateStatus(transactionId, 'completed', {
          mpesaReceiptNumber: parsedData.mpesaReceiptNumber,
          transactionDate: parsedData.transactionDate
        });

        // Create payment bridge record for blockchain processing
        PaymentBridge.create({
          mpesaTransactionId: transactionId,
          packageId: transaction.package_id,
          userWalletAddress: transaction.user_wallet_address,
          usdtAmount: transaction.amount,
          referrerAddress: null // Will be set when processing blockchain transaction
        });

        logger.info('M-Pesa payment completed successfully', {
          transactionId,
          mpesaReceiptNumber: parsedData.mpesaReceiptNumber,
          amount: transaction.amount
        });
      } else {
        // Payment failed
        Transaction.updateStatus(transactionId, 'failed', {
          errorMessage: parsedData.resultDesc
        });

        logger.warn('M-Pesa payment failed', {
          transactionId,
          resultCode: parsedData.resultCode,
          resultDesc: parsedData.resultDesc
        });
      }

      // Always respond with success to M-Pesa
      res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch (error) {
      logger.error('Error handling M-Pesa callback:', error);
      // Still respond with success to avoid M-Pesa retries
      res.json({ ResultCode: 0, ResultDesc: 'Success' });
    }
  }

  // Query payment status
  async queryPaymentStatus(req, res) {
    try {
      const { checkoutRequestId } = req.params;

      // Find transaction by checkout request ID
      const transaction = Transaction.findByCheckoutRequestId(checkoutRequestId);
      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      // Query M-Pesa for current status
      const queryResult = await mpesaService.querySTKPush(checkoutRequestId);
      
      if (queryResult.success) {
        const { data } = queryResult;
        
        // Update local transaction status if needed
        if (data.ResultCode === '0' && transaction.status === 'pending') {
          Transaction.updateStatus(transaction.id, 'completed');
        } else if (data.ResultCode !== '0' && data.ResultCode !== '1032') {
          // 1032 is "Request cancelled by user"
          Transaction.updateStatus(transaction.id, 'failed', {
            errorMessage: data.ResultDesc
          });
        }

        res.json({
          success: true,
          transaction: {
            id: transaction.id,
            status: transaction.status,
            amount: {
              usd: transaction.amount,
              kes: transaction.kes_amount
            },
            phoneNumber: transaction.phone_number,
            createdAt: transaction.created_at
          },
          mpesaStatus: {
            resultCode: data.ResultCode,
            resultDesc: data.ResultDesc
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: queryResult.error
        });
      }
    } catch (error) {
      logger.error('Error querying payment status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get transaction history for a wallet
  async getTransactionHistory(req, res) {
    try {
      const { walletAddress } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const transactions = Transaction.findByWalletAddress(
        walletAddress, 
        parseInt(limit), 
        parseInt(offset)
      );

      const stats = Transaction.getStats(walletAddress);

      res.json({
        success: true,
        transactions: transactions.map(tx => ({
          id: tx.id,
          packageId: tx.package_id,
          amount: {
            usd: tx.amount,
            kes: tx.kes_amount
          },
          phoneNumber: tx.phone_number,
          status: tx.status,
          mpesaReceiptNumber: tx.mpesa_receipt_number,
          transactionDate: tx.transaction_date,
          createdAt: tx.created_at
        })),
        stats: {
          totalTransactions: stats.total_transactions,
          completedTransactions: stats.completed_transactions,
          failedTransactions: stats.failed_transactions,
          pendingTransactions: stats.pending_transactions,
          totalAmountUsd: stats.total_amount_usd,
          totalAmountKes: stats.total_amount_kes
        }
      });
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Handle timeout callback
  async handleTimeout(req, res) {
    try {
      const { transactionId } = req.params;

      logger.info('M-Pesa timeout received', { transactionId });

      // Update transaction status to timeout
      Transaction.updateStatus(transactionId, 'timeout', {
        errorMessage: 'Transaction timed out'
      });

      res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch (error) {
      logger.error('Error handling M-Pesa timeout:', error);
      res.json({ ResultCode: 0, ResultDesc: 'Success' });
    }
  }

  // Get referral data for a wallet address
  async getReferralData(req, res) {
    try {
      const { walletAddress } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      logger.info('Fetching referral data', { walletAddress, limit, offset });

      // Get referral transactions where this address was the referrer
      const referralTransactions = PaymentBridge.findReferralsByReferrer(
        walletAddress,
        parseInt(limit),
        parseInt(offset)
      );

      // Get referral statistics
      const referralStats = PaymentBridge.getReferralStats(walletAddress);

      res.json({
        success: true,
        referrals: referralTransactions.map(ref => ({
          id: ref.id,
          packageId: ref.package_id,
          buyerAddress: ref.buyer_address,
          referrerAddress: ref.referrer_address,
          usdtAmount: ref.usdt_amount,
          mpesaStatus: ref.mpesa_status,
          blockchainStatus: ref.blockchain_status,
          txHash: ref.smart_contract_tx_hash,
          mpesaReceiptNumber: ref.mpesa_receipt_number,
          transactionDate: ref.transaction_date,
          createdAt: ref.created_at
        })),
        stats: {
          totalReferrals: referralStats?.total_referrals || 0,
          completedReferrals: referralStats?.completed_referrals || 0,
          totalReferralVolume: referralStats?.total_referral_volume || 0,
          lastReferralDate: referralStats?.last_referral_date || null
        }
      });
    } catch (error) {
      logger.error('Error getting referral data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export default new MpesaController();
