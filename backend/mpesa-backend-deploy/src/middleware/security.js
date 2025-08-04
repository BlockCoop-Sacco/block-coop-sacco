import crypto from 'crypto';
import logger from '../config/logger.js';
import { Transaction } from '../models/Transaction.js';
import db from '../config/database.js';

// Verify M-Pesa callback authenticity
export const verifyMpesaCallback = (req, res, next) => {
  try {
    // In production, you should verify the callback comes from Safaricom
    // This can be done by checking IP whitelist or using callback authentication
    
    const allowedIPs = [
      '196.201.214.200',
      '196.201.214.206',
      '196.201.213.114',
      '196.201.214.207',
      '196.201.214.208',
      '196.201.213.44',
      '196.201.212.127',
      '196.201.212.138',
      '196.201.212.129',
      '196.201.212.136',
      '196.201.212.74'
    ];

    const clientIP = req.ip || req.connection.remoteAddress;
    
    // In development, skip IP verification
    if (process.env.NODE_ENV === 'development') {
      logger.info('Skipping IP verification in development mode');
      return next();
    }

    // Check if request comes from allowed IP
    if (!allowedIPs.includes(clientIP)) {
      logger.warn('M-Pesa callback from unauthorized IP', { clientIP });
      return res.status(403).json({ error: 'Unauthorized' });
    }

    next();
  } catch (error) {
    logger.error('Error verifying M-Pesa callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Rate limiting for specific operations
export const createOperationRateLimit = (operation, windowMs = 60000, max = 5) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = `${operation}:${req.ip}`;
    const now = Date.now();
    
    // Clean old entries
    for (const [k, v] of attempts.entries()) {
      if (now - v.firstAttempt > windowMs) {
        attempts.delete(k);
      }
    }

    const userAttempts = attempts.get(key);
    
    if (!userAttempts) {
      attempts.set(key, { count: 1, firstAttempt: now });
      return next();
    }

    if (userAttempts.count >= max) {
      logger.warn(`Rate limit exceeded for operation ${operation}`, {
        ip: req.ip,
        attempts: userAttempts.count
      });
      return res.status(429).json({
        error: `Too many ${operation} attempts. Please try again later.`,
        retryAfter: Math.ceil((userAttempts.firstAttempt + windowMs - now) / 1000)
      });
    }

    userAttempts.count++;
    next();
  };
};

// Validate transaction integrity
export const validateTransactionIntegrity = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID required' });
    }

    // Check if transaction exists
    const transaction = Transaction.findById(transactionId);
    if (!transaction) {
      logger.warn('Transaction integrity check failed - not found', { transactionId });
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Check transaction age (prevent replay attacks)
    const transactionAge = Date.now() - new Date(transaction.created_at).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (transactionAge > maxAge) {
      logger.warn('Transaction integrity check failed - too old', {
        transactionId,
        age: transactionAge
      });
      return res.status(400).json({ error: 'Transaction too old' });
    }

    req.transaction = transaction;
    next();
  } catch (error) {
    logger.error('Error validating transaction integrity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Fraud detection middleware
export const fraudDetection = async (req, res, next) => {
  try {
    const { phoneNumber, amount, walletAddress } = req.body;
    const clientIP = req.ip;

    // Check for suspicious patterns
    const suspiciousPatterns = [];

    // 1. Check for multiple transactions from same phone in short time
    if (phoneNumber) {
      const recentTransactions = await checkRecentTransactionsByPhone(phoneNumber, 5 * 60 * 1000); // 5 minutes
      if (recentTransactions.length > 3) {
        suspiciousPatterns.push('multiple_phone_transactions');
      }
    }

    // 2. Check for multiple transactions from same IP
    const recentIPTransactions = await checkRecentTransactionsByIP(clientIP, 10 * 60 * 1000); // 10 minutes
    if (recentIPTransactions.length > 5) {
      suspiciousPatterns.push('multiple_ip_transactions');
    }

    // 3. Check for unusually large amounts
    if (amount && amount > 10000) { // $10,000 USD
      suspiciousPatterns.push('large_amount');
    }

    // 4. Check for wallet address patterns
    if (walletAddress) {
      const walletTransactions = await checkRecentTransactionsByWallet(walletAddress, 60 * 60 * 1000); // 1 hour
      if (walletTransactions.length > 10) {
        suspiciousPatterns.push('multiple_wallet_transactions');
      }
    }

    // Log suspicious activity
    if (suspiciousPatterns.length > 0) {
      logger.warn('Suspicious transaction patterns detected', {
        patterns: suspiciousPatterns,
        phoneNumber,
        amount,
        walletAddress,
        clientIP
      });

      // In production, you might want to require additional verification
      // For now, we'll just log and continue
    }

    req.fraudScore = suspiciousPatterns.length;
    req.suspiciousPatterns = suspiciousPatterns;
    next();
  } catch (error) {
    logger.error('Error in fraud detection:', error);
    // Don't block the request on fraud detection errors
    next();
  }
};

// Helper functions for fraud detection
async function checkRecentTransactionsByPhone(phoneNumber, timeWindow) {
  try {
    const cutoff = new Date(Date.now() - timeWindow).toISOString();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM mpesa_transactions 
      WHERE phone_number = ? AND created_at > ?
    `);
    const result = stmt.get(phoneNumber, cutoff);
    return Array(result.count).fill(null); // Return array with count length
  } catch (error) {
    logger.error('Error checking recent transactions by phone:', error);
    return [];
  }
}

async function checkRecentTransactionsByIP(ip, timeWindow) {
  try {
    const cutoff = new Date(Date.now() - timeWindow).toISOString();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM api_logs 
      WHERE ip_address = ? AND created_at > ? AND endpoint LIKE '%initiate-payment%'
    `);
    const result = stmt.get(ip, cutoff);
    return Array(result.count).fill(null);
  } catch (error) {
    logger.error('Error checking recent transactions by IP:', error);
    return [];
  }
}

async function checkRecentTransactionsByWallet(walletAddress, timeWindow) {
  try {
    const cutoff = new Date(Date.now() - timeWindow).toISOString();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM mpesa_transactions 
      WHERE user_wallet_address = ? AND created_at > ?
    `);
    const result = stmt.get(walletAddress, cutoff);
    return Array(result.count).fill(null);
  } catch (error) {
    logger.error('Error checking recent transactions by wallet:', error);
    return [];
  }
}

// Input sanitization
export const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize string inputs
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str.trim().replace(/[<>]/g, '');
    };

    // Recursively sanitize object
    const sanitizeObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };

    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);

    next();
  } catch (error) {
    logger.error('Error sanitizing input:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate secure transaction reference
export const generateSecureReference = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Verify webhook signature (for production use)
export const verifyWebhookSignature = (secret) => {
  return (req, res, next) => {
    try {
      const signature = req.headers['x-signature'];
      if (!signature) {
        return res.status(401).json({ error: 'Missing signature' });
      }

      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.warn('Invalid webhook signature', { signature, expectedSignature });
        return res.status(401).json({ error: 'Invalid signature' });
      }

      next();
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
