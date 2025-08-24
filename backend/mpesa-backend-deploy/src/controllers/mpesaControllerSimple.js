import logger from '../config/logger.js';

// Exchange rate configuration
const USD_TO_KES_RATE = parseFloat(process.env.USD_TO_KES_RATE) || 149.25;

class MpesaController {
  // Initiate M-Pesa payment - Simple mock version
  async initiatePayment(req, res) {
    try {
      const { 
        walletAddress, 
        packageId, 
        phoneNumber, 
        amount, // USD amount
        referrerAddress 
      } = req.body;

      // Basic validation
      if (!walletAddress || !packageId || !phoneNumber || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: walletAddress, packageId, phoneNumber, amount'
        });
      }

      // Convert USD to KES
      const kesAmount = Math.round(amount * USD_TO_KES_RATE);
      
      // Validate minimum amount (KES 1)
      if (kesAmount < 1) {
        return res.status(400).json({
          success: false,
          error: 'Amount too small. Minimum payment is KES 1.'
        });
      }

      // For now, return a mock response to test the connection
      const mockTransactionId = `mock_tx_${Date.now()}`;
      const mockCheckoutRequestId = `ws_CO_${Date.now()}`;

      logger.info('Mock M-Pesa payment initiated', {
        transactionId: mockTransactionId,
        checkoutRequestId: mockCheckoutRequestId,
        phoneNumber,
        amount,
        kesAmount,
        walletAddress,
        packageId
      });

      res.json({
        success: true,
        transactionId: mockTransactionId,
        checkoutRequestId: mockCheckoutRequestId,
        message: 'Payment request sent to your phone. Please enter your M-Pesa PIN to complete the transaction.',
        amount: {
          usd: amount,
          kes: kesAmount
        }
      });
    } catch (error) {
      logger.error('Error initiating M-Pesa payment:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Query payment status - Simple mock version
  async queryPaymentStatus(req, res) {
    try {
      const { checkoutRequestId } = req.params;

      if (!checkoutRequestId) {
        return res.status(400).json({
          success: false,
          error: 'Checkout request ID is required'
        });
      }

      logger.info('Mock payment status query', { checkoutRequestId });

      // Mock response
      res.json({
        success: true,
        transaction: {
          id: `mock_tx_${Date.now()}`,
          status: 'completed',
          amount: {
            usd: 100,
            kes: 14925
          },
          phoneNumber: '254712345678',
          createdAt: new Date().toISOString()
        },
        mpesaStatus: {
          resultCode: '0',
          resultDesc: 'Success'
        }
      });
    } catch (error) {
      logger.error('Error querying payment status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Handle M-Pesa callback - Simple mock version
  async handleCallback(req, res) {
    try {
      const { transactionId } = req.params;
      const callbackData = req.body;

      logger.info('Mock M-Pesa callback received', {
        transactionId,
        callbackData
      });

      res.json({
        ResultCode: 0,
        ResultDesc: 'Success'
      });
    } catch (error) {
      logger.error('Error handling M-Pesa callback:', error);
      res.status(500).json({
        ResultCode: 1,
        ResultDesc: 'Internal server error'
      });
    }
  }

  // Get transaction history - Simple mock version
  async getTransactionHistory(req, res) {
    try {
      const { walletAddress } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      logger.info('Mock transaction history request', {
        walletAddress,
        limit,
        offset
      });

      // Mock response
      res.json({
        success: true,
        transactions: [
          {
            id: `mock_tx_${Date.now()}`,
            walletAddress,
            packageId: 1,
            phoneNumber: '254712345678',
            amount: 100,
            kesAmount: 14925,
            status: 'completed',
            createdAt: new Date().toISOString()
          }
        ],
        pagination: {
          total: 1,
          limit: parseInt(limit),
          offset: parseInt(offset)
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
}

export default new MpesaController();
