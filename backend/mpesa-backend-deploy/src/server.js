import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routes
import mpesaRoutes from './routes/mpesa.js';
import bridgeRoutes from './routes/bridge.js';
// import recoveryRoutes from './routes/recovery.js';

// Import services
// import recoveryService from './services/recoveryService.js';

// Import middleware
import { createRateLimit } from './middleware/auth.js';
import logger from './config/logger.js';

// Initialize database
import './config/database.js';

// Load environment variables
dotenv.config();

// Environment validation
const validateEnvironment = () => {
  const requiredVars = [
    'CORS_ORIGIN',
    'CALLBACK_BASE_URL',
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_PASSKEY'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please check your cPanel Node.js App environment variables configuration.');
    process.exit(1);
  }

  // Log configuration status
  console.log('✅ Environment validation passed');
  console.log('📊 Configuration status:');
  console.log(`   - CORS Origin: ${process.env.CORS_ORIGIN}`);
  console.log(`   - Callback Base URL: ${process.env.CALLBACK_BASE_URL}`);
  console.log(`   - M-Pesa Environment: ${process.env.MPESA_ENVIRONMENT || 'sandbox'}`);
  console.log(`   - Database URL: ${process.env.DATABASE_URL || './data/mpesa_transactions.db'}`);
};

// Validate environment before starting
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 3001;

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
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Global rate limiting
app.use(createRateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
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
// app.use('/api/recovery', recoveryRoutes);

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
      'GET /',
      'GET /health',
      'GET /api/status',
      'POST /api/mpesa/initiate-payment',
      'GET /api/mpesa/status/:checkoutRequestId',
      'GET /api/mpesa/transactions/:walletAddress',
      'GET /api/mpesa/referrals/:walletAddress'
    ]
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

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`M-Pesa Backend Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);

  // Start recovery service
  // recoveryService.startRecoveryProcess();
  // logger.info('Recovery service started');
});

export default app;
