import { logger } from '../utils/logger.js';

// Custom error class for API errors
export class APIError extends Error {
  constructor(message, statusCode = 500, errorType = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error handler
export class ValidationError extends APIError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// M-Pesa specific error handler
export class MpesaError extends APIError {
  constructor(message, statusCode = 500, mpesaCode = null, details = null) {
    super(message, statusCode, 'MPESA_ERROR', details);
    this.name = 'MpesaError';
    this.mpesaCode = mpesaCode;
  }
}

// Blockchain error handler
export class BlockchainError extends APIError {
  constructor(message, statusCode = 500, details = null) {
    super(message, statusCode, 'BLOCKCHAIN_ERROR', details);
    this.name = 'BlockchainError';
  }
}

// Database error handler
export class DatabaseError extends APIError {
  constructor(message, statusCode = 500, details = null) {
    super(message, statusCode, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

// Main error handler middleware
export const errorHandler = (error, req, res, next) => {
  let statusCode = 500;
  let errorType = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details = null;

  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Handle different error types
  if (error instanceof APIError) {
    statusCode = error.statusCode;
    errorType = error.errorType;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorType = 'VALIDATION_ERROR';
    message = error.message;
    details = error.errors;
  } else if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    errorType = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = error.errors.map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    errorType = 'DUPLICATE_ERROR';
    message = 'Resource already exists';
    details = error.errors.map(err => ({
      field: err.path,
      message: err.message
    }));
  } else if (error.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    errorType = 'REFERENCE_ERROR';
    message = 'Invalid reference';
  } else if (error.name === 'SequelizeDatabaseError') {
    statusCode = 500;
    errorType = 'DATABASE_ERROR';
    message = 'Database operation failed';
  } else if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    errorType = 'SERVICE_UNAVAILABLE';
    message = 'External service unavailable';
  } else if (error.code === 'ETIMEDOUT') {
    statusCode = 504;
    errorType = 'TIMEOUT_ERROR';
    message = 'Request timeout';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorType = 'AUTHENTICATION_ERROR';
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorType = 'AUTHENTICATION_ERROR';
    message = 'Token expired';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
    details = null;
  }

  // Send error response
  const errorResponse = {
    success: false,
    error: message,
    errorType,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  };

  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req, res) => {
  const message = `Route ${req.originalUrl} not found`;
  
  logger.warn('Route not found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: message,
    errorType: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
