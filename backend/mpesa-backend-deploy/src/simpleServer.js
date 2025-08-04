import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Exchange rate configuration
const USD_TO_KES_RATE = parseFloat(process.env.USD_TO_KES_RATE) || 149.25;

// Simple logger
const logger = {
  info: (message, meta = {}) => console.log(`[INFO] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[ERROR] ${message}`, meta),
  warn: (message, meta = {}) => console.warn(`[WARN] ${message}`, meta)
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// M-Pesa API Routes

// Initiate M-Pesa payment
app.post('/api/mpesa/initiate-payment', (req, res) => {
  try {
    // Log the incoming request for debugging
    logger.info('Received M-Pesa payment request:', {
      body: req.body,
      headers: req.headers,
      contentType: req.get('Content-Type')
    });

    const {
      walletAddress,
      packageId,
      phoneNumber,
      amount, // USD amount
      referrerAddress
    } = req.body;

    // Detailed validation with specific error messages
    if (!walletAddress) {
      logger.warn('Validation failed: Missing walletAddress');
      return res.status(400).json({
        success: false,
        error: 'Missing required field: walletAddress'
      });
    }

    if (!packageId && packageId !== 0) {
      logger.warn('Validation failed: Missing packageId');
      return res.status(400).json({
        success: false,
        error: 'Missing required field: packageId'
      });
    }

    if (!phoneNumber) {
      logger.warn('Validation failed: Missing phoneNumber');
      return res.status(400).json({
        success: false,
        error: 'Missing required field: phoneNumber'
      });
    }

    if (!amount && amount !== 0) {
      logger.warn('Validation failed: Missing amount');
      return res.status(400).json({
        success: false,
        error: 'Missing required field: amount'
      });
    }

    // Type validation
    if (typeof walletAddress !== 'string') {
      logger.warn('Validation failed: walletAddress must be a string', { walletAddress, type: typeof walletAddress });
      return res.status(400).json({
        success: false,
        error: 'walletAddress must be a string'
      });
    }

    if (typeof phoneNumber !== 'string') {
      logger.warn('Validation failed: phoneNumber must be a string', { phoneNumber, type: typeof phoneNumber });
      return res.status(400).json({
        success: false,
        error: 'phoneNumber must be a string'
      });
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
      logger.warn('Validation failed: amount must be a valid number', { amount, type: typeof amount });
      return res.status(400).json({
        success: false,
        error: 'amount must be a valid number'
      });
    }

    if (typeof packageId !== 'number' || isNaN(packageId)) {
      logger.warn('Validation failed: packageId must be a valid number', { packageId, type: typeof packageId });
      return res.status(400).json({
        success: false,
        error: 'packageId must be a valid number'
      });
    }

    // Additional format validation
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(walletAddress)) {
      logger.warn('Validation failed: Invalid wallet address format', { walletAddress });
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }

    const phoneRegex = /^254[0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      logger.warn('Validation failed: Invalid phone number format', { phoneNumber });
      return res.status(400).json({
        success: false,
        error: 'Phone number must be in format 254XXXXXXXXX'
      });
    }

    if (amount <= 0) {
      logger.warn('Validation failed: Amount must be positive', { amount });
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    if (packageId < 0) {
      logger.warn('Validation failed: Package ID must be non-negative', { packageId });
      return res.status(400).json({
        success: false,
        error: 'Package ID must be non-negative'
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

    // Mock response
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
});

// Query payment status
app.get('/api/mpesa/status/:checkoutRequestId', (req, res) => {
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
});

// Handle M-Pesa callback
app.post('/api/mpesa/callback/:transactionId', (req, res) => {
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
});

// Handle M-Pesa timeout
app.post('/api/mpesa/timeout/:transactionId', (req, res) => {
  try {
    const { transactionId } = req.params;
    const timeoutData = req.body;

    logger.info('Mock M-Pesa timeout received', {
      transactionId,
      timeoutData
    });

    res.json({
      ResultCode: 0,
      ResultDesc: 'Success'
    });
  } catch (error) {
    logger.error('Error handling M-Pesa timeout:', error);
    res.status(500).json({
      ResultCode: 1,
      ResultDesc: 'Internal server error'
    });
  }
});

// Get transaction history
app.get('/api/mpesa/transactions/:walletAddress', (req, res) => {
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
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`M-Pesa Backend Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});

export default app;
