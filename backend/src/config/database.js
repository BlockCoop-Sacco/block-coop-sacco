import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL || path.join(dataDir, 'mpesa_transactions.db');

// Initialize database with better-sqlite3
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables synchronously
const createTables = () => {
  try {
    // M-Pesa transactions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS mpesa_transactions (
        id TEXT PRIMARY KEY,
        user_wallet_address TEXT NOT NULL,
        package_id INTEGER NOT NULL,
        phone_number TEXT NOT NULL,
        amount REAL NOT NULL,
        kes_amount REAL NOT NULL,
        checkout_request_id TEXT,
        merchant_request_id TEXT,
        mpesa_receipt_number TEXT,
        transaction_date TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'timeout')),
        blockchain_tx_hash TEXT,
        error_message TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Payment bridge records table
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_bridge (
        id TEXT PRIMARY KEY,
        mpesa_transaction_id TEXT NOT NULL,
        package_id INTEGER NOT NULL,
        user_wallet_address TEXT NOT NULL,
        usdt_amount REAL NOT NULL,
        blockchain_status TEXT DEFAULT 'pending' CHECK (blockchain_status IN ('pending', 'completed', 'failed')),
        smart_contract_tx_hash TEXT,
        referrer_address TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (mpesa_transaction_id) REFERENCES mpesa_transactions (id)
      )
    `);

    // Exchange rates table for historical tracking
    db.exec(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kes_to_usd REAL NOT NULL,
        usd_to_kes REAL NOT NULL,
        source TEXT DEFAULT 'manual',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // API logs table for debugging
    db.exec(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        request_body TEXT,
        response_body TEXT,
        status_code INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
};

// Create indexes for better performance
const createIndexes = () => {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_mpesa_wallet_address ON mpesa_transactions(user_wallet_address)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_mpesa_status ON mpesa_transactions(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_mpesa_checkout_request ON mpesa_transactions(checkout_request_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_bridge_mpesa_tx ON payment_bridge(mpesa_transaction_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_bridge_wallet ON payment_bridge(user_wallet_address)`);
};

// Initialize database
const initializeDatabase = () => {
  try {
    createTables();
    createIndexes();
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

initializeDatabase();

export default db;
