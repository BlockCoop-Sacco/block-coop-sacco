import express from 'express';
import { logger } from '../utils/logger.js';
import { MpesaTransaction } from '../models/MpesaTransaction.js';
import { sequelize } from '../database/connection.js';
import { Op } from 'sequelize';
import axios from 'axios';
import { ethers } from 'ethers';

const router = express.Router();

// Basic health check
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {}
    };

    // Check database connection
    try {
      await sequelize.authenticate();
      healthCheck.services.database = {
        status: 'healthy',
        type: 'sqlite'
      };
    } catch (error) {
      healthCheck.services.database = {
        status: 'unhealthy',
        error: error.message
      };
      healthCheck.status = 'degraded';
    }

    // Check M-Pesa configuration
    const mpesaConfig = {
      consumerKey: !!process.env.MPESA_CONSUMER_KEY,
      consumerSecret: !!process.env.MPESA_CONSUMER_SECRET,
      businessShortCode: !!process.env.MPESA_BUSINESS_SHORT_CODE,
      passkey: !!process.env.MPESA_PASSKEY,
      baseUrl: !!process.env.MPESA_BASE_URL
    };

    const mpesaConfigured = Object.values(mpesaConfig).every(Boolean);
    healthCheck.services.mpesa = {
      status: mpesaConfigured ? 'configured' : 'not_configured',
      config: mpesaConfig
    };

    if (!mpesaConfigured) {
      healthCheck.status = 'degraded';
    }

    // Check blockchain configuration
    const blockchainConfig = {
      rpcUrl: !!process.env.BSC_RPC_URL,
      privateKey: !!process.env.PRIVATE_KEY,
      usdtAddress: !!process.env.USDT_ADDRESS,
      packageManagerAddress: !!process.env.PACKAGE_MANAGER_ADDRESS
    };

    const blockchainConfigured = Object.values(blockchainConfig).every(Boolean);
    healthCheck.services.blockchain = {
      status: blockchainConfigured ? 'configured' : 'not_configured',
      config: blockchainConfig
    };

    if (!blockchainConfigured) {
      healthCheck.status = 'degraded';
    }

    res.json(healthCheck);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV || 'development',
      services: {},
      metrics: {}
    };

    // Database health with metrics
    try {
      await sequelize.authenticate();
      
      // Get transaction counts
      const transactionCounts = await MpesaTransaction.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const totalTransactions = await MpesaTransaction.count();
      const recentTransactions = await MpesaTransaction.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      detailedHealth.services.database = {
        status: 'healthy',
        type: 'sqlite',
        metrics: {
          totalTransactions,
          recentTransactions,
          statusBreakdown: transactionCounts.reduce((acc, item) => {
            acc[item.status] = parseInt(item.count);
            return acc;
          }, {})
        }
      };
    } catch (error) {
      detailedHealth.services.database = {
        status: 'unhealthy',
        error: error.message
      };
      detailedHealth.status = 'degraded';
    }

    // M-Pesa API connectivity test
    if (process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET) {
      try {
        const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
        const baseUrl = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
        
        const response = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
          headers: {
            'Authorization': `Basic ${auth}`
          },
          timeout: 5000
        });

        detailedHealth.services.mpesa = {
          status: 'healthy',
          connectivity: 'connected',
          responseTime: response.headers['x-response-time'] || 'unknown'
        };
      } catch (error) {
        detailedHealth.services.mpesa = {
          status: 'degraded',
          connectivity: 'failed',
          error: error.message
        };
        detailedHealth.status = 'degraded';
      }
    } else {
      detailedHealth.services.mpesa = {
        status: 'not_configured',
        connectivity: 'not_tested'
      };
    }

    // Blockchain connectivity test
    if (process.env.BSC_RPC_URL) {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
        const blockNumber = await provider.getBlockNumber();
        
        detailedHealth.services.blockchain = {
          status: 'healthy',
          connectivity: 'connected',
          currentBlock: blockNumber,
          network: 'BSC'
        };
      } catch (error) {
        detailedHealth.services.blockchain = {
          status: 'degraded',
          connectivity: 'failed',
          error: error.message
        };
        detailedHealth.status = 'degraded';
      }
    } else {
      detailedHealth.services.blockchain = {
        status: 'not_configured',
        connectivity: 'not_tested'
      };
    }

    res.json(detailedHealth);
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness probe
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    await sequelize.authenticate();
    
    const requiredEnvVars = [
      'MPESA_CONSUMER_KEY',
      'MPESA_CONSUMER_SECRET',
      'MPESA_BUSINESS_SHORT_CODE',
      'MPESA_PASSKEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return res.status(503).json({
        ready: false,
        reason: 'Missing required environment variables',
        missing: missingVars
      });
    }

    res.json({
      ready: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      ready: false,
      reason: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
