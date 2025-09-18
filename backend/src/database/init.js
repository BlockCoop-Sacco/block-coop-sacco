import { sequelize } from './connection.js';
import { MpesaTransaction } from '../models/MpesaTransaction.js';
import { GaslessTransaction } from '../models/GaslessTransaction.js';
import { logger } from '../utils/logger.js';

export async function initializeDatabase() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync models (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    logger.info('Database models synchronized');

    // Create indexes for better performance
    await createIndexes();
    logger.info('Database indexes created');

    return true;
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    throw error;
  }
}

async function createIndexes() {
  try {
    // Additional custom indexes can be created here
    // Most indexes are already defined in the model
    
    // Example: Composite index for wallet + status queries
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_status 
      ON mpesa_transactions(wallet_address, status)
    `);

    // Index for date range queries
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_created_at_status 
      ON mpesa_transactions(created_at, status)
    `);

  } catch (error) {
    logger.warn('Some indexes may already exist:', error.message);
  }
}

export async function closeDatabase() {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}
