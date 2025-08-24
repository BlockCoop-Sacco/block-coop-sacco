import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import logger from '../config/logger.js';

class Transaction {
  // Create a new M-Pesa transaction
  static create(transactionData) {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO mpesa_transactions (
          id, user_wallet_address, package_id, phone_number, amount, kes_amount,
          checkout_request_id, merchant_request_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        id,
        transactionData.userWalletAddress,
        transactionData.packageId,
        transactionData.phoneNumber,
        transactionData.amount,
        transactionData.kesAmount,
        transactionData.checkoutRequestId || null,
        transactionData.merchantRequestId || null,
        'pending',
        now,
        now
      );

      if (result.changes > 0) {
        logger.info('M-Pesa transaction created', { transactionId: id });
        return { id, ...transactionData, status: 'pending', created_at: now, updated_at: now };
      } else {
        throw new Error('Failed to create transaction');
      }
    } catch (error) {
      logger.error('Error creating M-Pesa transaction:', error);
      throw error;
    }
  }

  // Find transaction by ID
  static findById(id) {
    try {
      const stmt = db.prepare('SELECT * FROM mpesa_transactions WHERE id = ?');
      return stmt.get(id);
    } catch (error) {
      logger.error('Error finding transaction by ID:', error);
      throw error;
    }
  }

  // Find transaction by checkout request ID
  static findByCheckoutRequestId(checkoutRequestId) {
    try {
      const stmt = db.prepare('SELECT * FROM mpesa_transactions WHERE checkout_request_id = ?');
      return stmt.get(checkoutRequestId);
    } catch (error) {
      logger.error('Error finding transaction by checkout request ID:', error);
      throw error;
    }
  }

  // Find transactions by wallet address
  static findByWalletAddress(walletAddress, limit = 50, offset = 0) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM mpesa_transactions 
        WHERE user_wallet_address = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `);
      return stmt.all(walletAddress, limit, offset);
    } catch (error) {
      logger.error('Error finding transactions by wallet address:', error);
      throw error;
    }
  }

  // Update transaction status
  static updateStatus(id, status, additionalData = {}) {
    try {
      const now = new Date().toISOString();
      let updateFields = ['status = ?', 'updated_at = ?'];
      let values = [status, now];
      
      // Add additional fields if provided
      if (additionalData.checkoutRequestId) {
        updateFields.push('checkout_request_id = ?');
        values.push(additionalData.checkoutRequestId);
      }

      if (additionalData.merchantRequestId) {
        updateFields.push('merchant_request_id = ?');
        values.push(additionalData.merchantRequestId);
      }

      if (additionalData.mpesaReceiptNumber) {
        updateFields.push('mpesa_receipt_number = ?');
        values.push(additionalData.mpesaReceiptNumber);
      }

      if (additionalData.transactionDate) {
        updateFields.push('transaction_date = ?');
        values.push(additionalData.transactionDate);
      }

      if (additionalData.blockchainTxHash) {
        updateFields.push('blockchain_tx_hash = ?');
        values.push(additionalData.blockchainTxHash);
      }

      if (additionalData.errorMessage) {
        updateFields.push('error_message = ?');
        values.push(additionalData.errorMessage);
      }
      
      values.push(id); // Add ID for WHERE clause
      
      const stmt = db.prepare(`
        UPDATE mpesa_transactions 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `);
      
      const result = stmt.run(...values);
      
      if (result.changes > 0) {
        logger.info('Transaction status updated', { transactionId: id, status });
        return this.findById(id);
      }
      
      throw new Error('Transaction not found or not updated');
    } catch (error) {
      logger.error('Error updating transaction status:', error);
      throw error;
    }
  }

  // Get transaction statistics
  static getStats(walletAddress = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount_usd,
          SUM(CASE WHEN status = 'completed' THEN kes_amount ELSE 0 END) as total_amount_kes
        FROM mpesa_transactions
      `;
      
      let params = [];
      
      if (walletAddress) {
        query += ' WHERE user_wallet_address = ?';
        params.push(walletAddress);
      }
      
      const stmt = db.prepare(query);
      return stmt.get(...params);
    } catch (error) {
      logger.error('Error getting transaction stats:', error);
      throw error;
    }
  }
}

// Payment Bridge Model
class PaymentBridge {
  // Create a new payment bridge record
  static create(bridgeData) {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const stmt = db.prepare(`
        INSERT INTO payment_bridge (
          id, mpesa_transaction_id, package_id, user_wallet_address, 
          usdt_amount, referrer_address, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        id,
        bridgeData.mpesaTransactionId,
        bridgeData.packageId,
        bridgeData.userWalletAddress,
        bridgeData.usdtAmount,
        bridgeData.referrerAddress || null,
        now
      );
      
      if (result.changes > 0) {
        logger.info('Payment bridge record created', { bridgeId: id });
        return this.findById(id);
      }
      
      throw new Error('Failed to create payment bridge record');
    } catch (error) {
      logger.error('Error creating payment bridge record:', error);
      throw error;
    }
  }

  // Find bridge record by ID
  static findById(id) {
    try {
      const stmt = db.prepare('SELECT * FROM payment_bridge WHERE id = ?');
      return stmt.get(id);
    } catch (error) {
      logger.error('Error finding payment bridge by ID:', error);
      throw error;
    }
  }

  // Update blockchain status
  static updateBlockchainStatus(id, status, txHash = null) {
    try {
      const stmt = db.prepare(`
        UPDATE payment_bridge
        SET blockchain_status = ?, smart_contract_tx_hash = ?
        WHERE id = ?
      `);

      const result = stmt.run(status, txHash, id);

      if (result.changes > 0) {
        logger.info('Payment bridge blockchain status updated', { bridgeId: id, status });
        return this.findById(id);
      }

      throw new Error('Payment bridge record not found or not updated');
    } catch (error) {
      logger.error('Error updating payment bridge blockchain status:', error);
      throw error;
    }
  }

  // Get referral transactions where this address was the referrer
  static findReferralsByReferrer(referrerAddress, limit = 50, offset = 0) {
    try {
      const stmt = db.prepare(`
        SELECT
          pb.id,
          pb.package_id,
          pb.user_wallet_address as buyer_address,
          pb.referrer_address,
          pb.usdt_amount,
          pb.blockchain_status,
          pb.smart_contract_tx_hash,
          pb.created_at,
          mt.status as mpesa_status,
          mt.mpesa_receipt_number,
          mt.transaction_date
        FROM payment_bridge pb
        JOIN mpesa_transactions mt ON pb.mpesa_transaction_id = mt.id
        WHERE pb.referrer_address = ?
        AND mt.status = 'completed'
        ORDER BY pb.created_at DESC
        LIMIT ? OFFSET ?
      `);
      return stmt.all(referrerAddress, limit, offset);
    } catch (error) {
      logger.error('Error finding referrals by referrer:', error);
      throw error;
    }
  }

  // Get referral statistics for a referrer
  static getReferralStats(referrerAddress) {
    try {
      const stmt = db.prepare(`
        SELECT
          COUNT(*) as total_referrals,
          COUNT(CASE WHEN mt.status = 'completed' THEN 1 END) as completed_referrals,
          SUM(CASE WHEN mt.status = 'completed' THEN pb.usdt_amount ELSE 0 END) as total_referral_volume,
          MAX(pb.created_at) as last_referral_date
        FROM payment_bridge pb
        JOIN mpesa_transactions mt ON pb.mpesa_transaction_id = mt.id
        WHERE pb.referrer_address = ?
      `);
      return stmt.get(referrerAddress);
    } catch (error) {
      logger.error('Error getting referral stats:', error);
      throw error;
    }
  }
}

export { Transaction, PaymentBridge };
