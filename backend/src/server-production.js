import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import mpesaRoutes from './routes/mpesa.js';
import bridgeRoutes from './routes/bridge.js';

// Import middleware
import { createRateLimit } from './middleware/auth.js';
import logger from './config/logger.js';

// Initialize database
import './config/database.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for cPanel hosting
app.set('trust proxy', true);

// Enhanced security middleware for production
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.safaricom.co.ke", "https://sandbox.safaricom.co.ke"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CORS_ORIGIN,
      'https://shares.blockcoopsacco.com',
      'https://www.blockcoopsacco.com',
      'https://blockcoopsacco.com'
    ].filter(Boolean);
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: process.env.MAX_REQUEST_SIZE || '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_REQUEST_SIZE || '10mb' 
}));

// Enhanced logging for production
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  },
  skip: (req, res) => {
    // Skip logging for health checks to reduce noise
    return req.url === '/health' && res.statusCode < 400;
  }
}));

// Global rate limiting with enhanced configuration
app.use(createRateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Health check endpoint with detailed information
app.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: 'connected',
      mpesa: 'configured'
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  };
  
  res.json(healthData);
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    api: 'BlockCoop M-Pesa Backend',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      mpesa: '/api/mpesa',
      bridge: '/api/bridge',
      health: '/health'
    }
  });
});

// API routes
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/bridge', bridgeRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'BlockCoop M-Pesa Backend API',
    version: '1.0.0',
    documentation: '/api/status',
    health: '/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /api/status',
      'POST /api/mpesa/initiate-payment',
      'GET /api/mpesa/status/:checkoutRequestId',
      'GET /api/mpesa/transactions/:walletAddress'
    ]
  });
});

// Enhanced error handler for production
app.use((error, req, res, next) => {
  // Log the full error details
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Send appropriate response based on environment
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { 
      stack: error.stack,
      details: error.details 
    }),
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  const shutdownTimeout = setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT) || 10000);
  
  // Close server and cleanup
  server.close(() => {
    clearTimeout(shutdownTimeout);
    logger.info('Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 BlockCoop M-Pesa Backend Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  logger.info(`🔒 Security: Enhanced production mode`);
  logger.info(`💾 Database: SQLite initialized`);
  logger.info(`📱 M-Pesa: ${process.env.MPESA_ENVIRONMENT || 'sandbox'} mode`);
  
  // Log startup completion
  logger.info('✅ Server startup completed successfully');
});

export default app;
