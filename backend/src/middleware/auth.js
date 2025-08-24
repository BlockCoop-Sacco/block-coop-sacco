import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

// API Key authentication middleware
export const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.API_KEY;

  if (!expectedApiKey) {
    logger.error('API_KEY not configured in environment');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      errorType: 'AUTHENTICATION_ERROR'
    });
  }

  if (apiKey !== expectedApiKey) {
    logger.warn('Invalid API key attempt:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      providedKey: apiKey.substring(0, 8) + '...'
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      errorType: 'AUTHENTICATION_ERROR'
    });
  }

  next();
};

// Optional authentication middleware (for public endpoints)
export const authMiddleware = (req, res, next) => {
  // For now, we'll skip authentication for M-Pesa endpoints
  // In production, you might want to implement wallet signature verification
  next();
};

// Wallet signature verification (for future implementation)
export const verifyWalletSignature = async (req, res, next) => {
  try {
    const { walletAddress, signature, message } = req.body;
    
    if (!walletAddress || !signature || !message) {
      return res.status(400).json({
        success: false,
        error: 'Wallet verification data required',
        errorType: 'VALIDATION_ERROR'
      });
    }

    // TODO: Implement ethers signature verification
    // const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    // if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    //   return res.status(401).json({
    //     success: false,
    //     error: 'Invalid wallet signature',
    //     errorType: 'AUTHENTICATION_ERROR'
    //   });
    // }

    next();
  } catch (error) {
    logger.error('Wallet signature verification failed:', error);
    return res.status(401).json({
      success: false,
      error: 'Signature verification failed',
      errorType: 'AUTHENTICATION_ERROR'
    });
  }
};

// Rate limiting by wallet address
export const walletRateLimit = (maxRequests = 5, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    const walletAddress = req.body.walletAddress || req.params.walletAddress;
    
    if (!walletAddress) {
      return next();
    }

    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [address, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(t => t > windowStart);
      if (validTimestamps.length === 0) {
        requests.delete(address);
      } else {
        requests.set(address, validTimestamps);
      }
    }

    // Check current wallet's requests
    const walletRequests = requests.get(walletAddress) || [];
    const recentRequests = walletRequests.filter(t => t > windowStart);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests from this wallet',
        errorType: 'RATE_LIMIT_ERROR',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);
    requests.set(walletAddress, recentRequests);

    next();
  };
};
