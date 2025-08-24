import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import './config/env.js';

// Import routes
import mpesaRoutes from './routes/mpesa.js';
import healthRoutes from './routes/health.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { logger } from './utils/logger.js';

// Import database
import { initializeDatabase } from './database/init.js';

// Import services
import recoveryService from './services/recoveryService.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// dotenv is loaded in ./config/env.js

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173",
  "https://shares.blockcoopsacco.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);


// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 payment requests per minute
  message: 'Too many payment requests, please try again later.'
});

app.use('/api', generalLimiter);
app.use('/api/mpesa/initiate-payment', paymentLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check route (no auth required)
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/mpesa', mpesaRoutes);

// Also mount under /api/blockcoop to match Daraja-configured CALLBACK URLs
app.use('/api/blockcoop', mpesaRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    logger.info('Database initialized successfully');

    app.listen(PORT, () => {
      logger.info(`🚀 BlockCoop Backend API running on port ${PORT}`);
      logger.info(`📱 M-Pesa integration ready`);
      logger.info(`🔗 Blockchain integration enabled`);
      logger.info(`🔄 Recovery service initialized`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

export default app;
