import { validationResult } from 'express-validator';
import { ValidationError } from './errorHandler.js';

// Middleware to handle validation results
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    throw new ValidationError('Validation failed', validationErrors);
  }
  
  next();
};

// Rate limiting by wallet address
const walletLimitStore = new Map();

export const walletRateLimit = (maxRequests, windowMs) => {
  return (req, res, next) => {
    const walletAddress = req.body.walletAddress || req.params.walletAddress;
    
    if (!walletAddress) {
      return next();
    }

    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, requests] of walletLimitStore.entries()) {
      const filteredRequests = requests.filter(timestamp => timestamp > windowStart);
      if (filteredRequests.length === 0) {
        walletLimitStore.delete(key);
      } else {
        walletLimitStore.set(key, filteredRequests);
      }
    }
    
    // Check current wallet requests
    const walletRequests = walletLimitStore.get(walletAddress) || [];
    const recentRequests = walletRequests.filter(timestamp => timestamp > windowStart);
    
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests from this wallet',
        errorType: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }
    
    // Add current request
    recentRequests.push(now);
    walletLimitStore.set(walletAddress, recentRequests);
    
    next();
  };
};

// Phone number validation
export const validatePhoneNumber = (phoneNumber) => {
  // Kenyan phone number format: 254XXXXXXXXX
  const phoneRegex = /^254[0-9]{9}$/;
  return phoneRegex.test(phoneNumber);
};

// Wallet address validation
export const validateWalletAddress = (address) => {
  // Ethereum address format: 0x followed by 40 hex characters
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addressRegex.test(address);
};

// Amount validation
export const validateAmount = (amount, min = 0.01, max = 10000) => {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount >= min && numAmount <= max;
};

// Package ID validation
export const validatePackageId = (packageId) => {
  const numPackageId = parseInt(packageId);
  return !isNaN(numPackageId) && numPackageId >= 0 && numPackageId <= 1000;
};

// Sanitize input data
export const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    return data.trim().replace(/[<>]/g, '');
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
};

// Request sanitization middleware
export const sanitizeRequest = (req, res, next) => {
  req.body = sanitizeInput(req.body);
  req.query = sanitizeInput(req.query);
  req.params = sanitizeInput(req.params);
  next();
};

export default validateRequest;
