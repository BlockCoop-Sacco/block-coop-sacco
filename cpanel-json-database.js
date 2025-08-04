import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// JSON file paths
const transactionsFile = path.join(dataDir, 'mpesa_transactions.json');
const bridgeFile = path.join(dataDir, 'payment_bridge.json');

// Simple JSON database wrapper
class JsonDatabase {
  constructor() {
    this.transactions = this.loadData(transactionsFile, []);
    this.bridges = this.loadData(bridgeFile, []);
  }

  loadData(filePath, defaultValue) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return defaultValue;
    } catch (error) {
      console.error(`Error loading data from ${filePath}:`, error);
      return defaultValue;
    }
  }

  saveData(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving data to ${filePath}:`, error);
    }
  }

  // Transaction methods
  createTransaction(transactionData) {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const transaction = {
      id,
      user_wallet_address: transactionData.userWalletAddress,
      package_id: transactionData.packageId,
      phone_number: transactionData.phoneNumber,
      amount: transactionData.amount,
      kes_amount: transactionData.kesAmount,
      checkout_request_id: transactionData.checkoutRequestId || null,
      merchant_request_id: transactionData.merchantRequestId || null,
      mpesa_receipt_number: null,
      transaction_date: null,
      status: 'pending',
      blockchain_tx_hash: null,
      error_message: null,
      created_at: now,
      updated_at: now
    };

    this.transactions.push(transaction);
    this.saveData(transactionsFile, this.transactions);
    return transaction;
  }

  findTransactionById(id) {
    return this.transactions.find(t => t.id === id);
  }

  findTransactionByCheckoutRequestId(checkoutRequestId) {
    return this.transactions.find(t => t.checkout_request_id === checkoutRequestId);
  }

  updateTransaction(id, updates) {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      this.transactions[index] = {
        ...this.transactions[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      this.saveData(transactionsFile, this.transactions);
      return this.transactions[index];
    }
    return null;
  }

  findTransactionsByWalletAddress(walletAddress, limit = 50, offset = 0) {
    const filtered = this.transactions
      .filter(t => t.user_wallet_address === walletAddress)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + limit);
    return filtered;
  }

  getTransactionStats(walletAddress = null) {
    let transactions = this.transactions;
    
    if (walletAddress) {
      transactions = transactions.filter(t => t.user_wallet_address === walletAddress);
    }

    const stats = {
      total_transactions: transactions.length,
      completed_transactions: transactions.filter(t => t.status === 'completed').length,
      failed_transactions: transactions.filter(t => t.status === 'failed').length,
      pending_transactions: transactions.filter(t => t.status === 'pending').length,
      total_amount_usd: transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0),
      total_amount_kes: transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.kes_amount, 0)
    };

    return stats;
  }

  // Bridge methods
  createBridge(bridgeData) {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const bridge = {
      id,
      mpesa_transaction_id: bridgeData.mpesaTransactionId,
      package_id: bridgeData.packageId,
      user_wallet_address: bridgeData.userWalletAddress,
      usdt_amount: bridgeData.usdtAmount,
      blockchain_status: 'pending',
      smart_contract_tx_hash: null,
      referrer_address: bridgeData.referrerAddress || null,
      created_at: now
    };

    this.bridges.push(bridge);
    this.saveData(bridgeFile, this.bridges);
    return bridge;
  }

  findBridgeById(id) {
    return this.bridges.find(b => b.id === id);
  }

  updateBridge(id, updates) {
    const index = this.bridges.findIndex(b => b.id === id);
    if (index !== -1) {
      this.bridges[index] = {
        ...this.bridges[index],
        ...updates
      };
      this.saveData(bridgeFile, this.bridges);
      return this.bridges[index];
    }
    return null;
  }

  // Database wrapper methods to mimic better-sqlite3 API
  prepare(sql) {
    // This is a simplified implementation for compatibility
    return {
      run: (...params) => ({ changes: 1 }),
      get: (...params) => null,
      all: (...params) => []
    };
  }

  exec(sql) {
    // No-op for compatibility
    console.log('SQL exec (ignored in JSON mode):', sql);
  }

  pragma(pragmaString) {
    // No-op for compatibility
    console.log('Pragma (ignored in JSON mode):', pragmaString);
  }
}

// Initialize database
const db = new JsonDatabase();

console.log('JSON Database initialized successfully');

export default db;
