import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TestDatabase {
  constructor() {
    this.db = null;
    this.testDataPath = join(__dirname, '../data');
    this.backupPath = join(__dirname, '../data/backups');
  }

  // Initialize test database
  async initialize() {
    try {
      // Ensure test data directories exist
      if (!fs.existsSync(this.testDataPath)) {
        fs.mkdirSync(this.testDataPath, { recursive: true });
      }
      if (!fs.existsSync(this.backupPath)) {
        fs.mkdirSync(this.backupPath, { recursive: true });
      }

      // Create in-memory database for tests
      this.db = new Database(':memory:');
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Create tables
      await this.createTables();
      
      console.log('Test database initialized successfully');
      return this.db;
    } catch (error) {
      console.error('Error initializing test database:', error);
      throw error;
    }
  }

  // Create all required tables
  async createTables() {
    const tables = [
      // M-Pesa transactions table
      `CREATE TABLE IF NOT EXISTS mpesa_transactions (
        id TEXT PRIMARY KEY,
        user_wallet_address TEXT NOT NULL,
        package_id INTEGER NOT NULL,
        phone_number TEXT NOT NULL,
        amount REAL NOT NULL,
        kes_amount INTEGER NOT NULL,
        checkout_request_id TEXT,
        merchant_request_id TEXT,
        mpesa_receipt_number TEXT,
        transaction_date TEXT,
        blockchain_tx_hash TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      
      // Payment bridge table
      `CREATE TABLE IF NOT EXISTS payment_bridge (
        id TEXT PRIMARY KEY,
        mpesa_transaction_id TEXT NOT NULL,
        package_id INTEGER NOT NULL,
        user_wallet_address TEXT NOT NULL,
        usdt_amount REAL NOT NULL,
        referrer_address TEXT,
        blockchain_status TEXT DEFAULT 'pending',
        blockchain_tx_hash TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (mpesa_transaction_id) REFERENCES mpesa_transactions(id)
      )`,
      
      // Rate limiting table
      `CREATE TABLE IF NOT EXISTS rate_limits (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        operation TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        window_start INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )`,
      
      // Fraud detection table
      `CREATE TABLE IF NOT EXISTS fraud_attempts (
        id TEXT PRIMARY KEY,
        phone_number TEXT,
        wallet_address TEXT,
        ip_address TEXT,
        attempt_type TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        blocked BOOLEAN DEFAULT FALSE,
        created_at TEXT NOT NULL
      )`
    ];

    for (const tableSQL of tables) {
      this.db.exec(tableSQL);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status ON mpesa_transactions(status)',
      'CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_phone ON mpesa_transactions(phone_number)',
      'CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_wallet ON mpesa_transactions(user_wallet_address)',
      'CREATE INDEX IF NOT EXISTS idx_payment_bridge_mpesa_id ON payment_bridge(mpesa_transaction_id)',
      'CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, operation)',
      'CREATE INDEX IF NOT EXISTS idx_fraud_attempts_phone ON fraud_attempts(phone_number)'
    ];

    for (const indexSQL of indexes) {
      this.db.exec(indexSQL);
    }
  }

  // Seed test data
  async seedTestData() {
    const testData = {
      // Test transactions
      transactions: [
        {
          id: 'test-tx-1',
          user_wallet_address: '0x1234567890123456789012345678901234567890',
          package_id: 1,
          phone_number: '254708374149',
          amount: 100,
          kes_amount: 14925,
          status: 'completed',
          checkout_request_id: 'ws_CO_test_123',
          merchant_request_id: 'merchant_test_123',
          mpesa_receipt_number: 'QHX12345',
          transaction_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'test-tx-2',
          user_wallet_address: '0x2345678901234567890123456789012345678901',
          package_id: 2,
          phone_number: '254708374150',
          amount: 50,
          kes_amount: 7462,
          status: 'pending',
          checkout_request_id: 'ws_CO_test_456',
          merchant_request_id: 'merchant_test_456',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };

    // Insert test transactions
    const insertTransaction = this.db.prepare(`
      INSERT INTO mpesa_transactions (
        id, user_wallet_address, package_id, phone_number, amount, kes_amount,
        status, checkout_request_id, merchant_request_id, mpesa_receipt_number,
        transaction_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const tx of testData.transactions) {
      insertTransaction.run(
        tx.id, tx.user_wallet_address, tx.package_id, tx.phone_number,
        tx.amount, tx.kes_amount, tx.status, tx.checkout_request_id,
        tx.merchant_request_id, tx.mpesa_receipt_number, tx.transaction_date,
        tx.created_at, tx.updated_at
      );
    }

    console.log('Test data seeded successfully');
  }

  // Clean up test data
  async cleanup() {
    if (this.db) {
      const tables = ['mpesa_transactions', 'payment_bridge', 'rate_limits', 'fraud_attempts'];
      for (const table of tables) {
        this.db.exec(`DELETE FROM ${table}`);
      }
    }
  }

  // Close database connection
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Get database instance
  getDatabase() {
    return this.db;
  }

  // Create test transaction
  createTestTransaction(data = {}) {
    const defaultData = {
      id: `test-tx-${Date.now()}`,
      user_wallet_address: '0x1234567890123456789012345678901234567890',
      package_id: 1,
      phone_number: '254708374149',
      amount: 100,
      kes_amount: 14925,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const transactionData = { ...defaultData, ...data };
    
    const stmt = this.db.prepare(`
      INSERT INTO mpesa_transactions (
        id, user_wallet_address, package_id, phone_number, amount, kes_amount,
        checkout_request_id, merchant_request_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      transactionData.id,
      transactionData.user_wallet_address,
      transactionData.package_id,
      transactionData.phone_number,
      transactionData.amount,
      transactionData.kes_amount,
      transactionData.checkout_request_id || null,
      transactionData.merchant_request_id || null,
      transactionData.status,
      transactionData.created_at,
      transactionData.updated_at
    );

    return transactionData;
  }
}

export default TestDatabase;
