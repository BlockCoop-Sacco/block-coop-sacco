import { DataTypes } from 'sequelize';
import { sequelize } from '../database/connection.js';

export const MpesaTransaction = sequelize.define('MpesaTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Blockchain related fields
  walletAddress: {
    type: DataTypes.STRING(42),
    allowNull: false,
    validate: {
      is: /^0x[a-fA-F0-9]{40}$/
    }
  },
  
  packageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  
  referrerAddress: {
    type: DataTypes.STRING(42),
    allowNull: true,
    validate: {
      is: /^0x[a-fA-F0-9]{40}$/
    }
  },
  
  // M-Pesa related fields
  phoneNumber: {
    type: DataTypes.STRING(12),
    allowNull: false,
    validate: {
      is: /^254[0-9]{9}$/
    }
  },
  
  amountUsd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  
  amountKes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  
  // M-Pesa API response fields
  checkoutRequestId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  
  merchantRequestId: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  mpesaReceiptNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true
  },
  
  // Transaction status
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled', 'timeout'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  // M-Pesa result codes
  resultCode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  
  resultDesc: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Blockchain transaction hash (when USDT purchase is executed)
  blockchainTxHash: {
    type: DataTypes.STRING(66),
    allowNull: true,
    validate: {
      is: /^0x[a-fA-F0-9]{64}$/
    }
  },
  
  // In-flight blockchain processing lock to prevent duplicate on-chain purchases
  blockchainProcessing: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  // Error tracking
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Callback data
  callbackData: {
    type: DataTypes.JSON,
    allowNull: true
  },
  
  // Timestamps
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Retry tracking
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  lastRetryAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'mpesa_transactions',
  timestamps: true,
  indexes: [
    {
      fields: ['walletAddress']
    },
    {
      fields: ['checkoutRequestId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['phoneNumber']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['packageId']
    }
  ]
});

// Instance methods
MpesaTransaction.prototype.markAsCompleted = function(mpesaReceiptNumber, callbackData) {
  return this.update({
    status: 'completed',
    mpesaReceiptNumber,
    callbackData,
    completedAt: new Date(),
    transactionDate: new Date()
  });
};

MpesaTransaction.prototype.markAsFailed = function(errorMessage, resultCode, resultDesc) {
  return this.update({
    status: 'failed',
    errorMessage,
    resultCode,
    resultDesc,
    completedAt: new Date()
  });
};

MpesaTransaction.prototype.incrementRetry = function() {
  return this.update({
    retryCount: this.retryCount + 1,
    lastRetryAt: new Date()
  });
};

// Class methods
MpesaTransaction.findByCheckoutRequestId = function(checkoutRequestId) {
  return this.findOne({
    where: { checkoutRequestId }
  });
};

MpesaTransaction.findByWalletAddress = function(walletAddress, limit = 50, offset = 0) {
  return this.findAndCountAll({
    where: { walletAddress },
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });
};

MpesaTransaction.getStats = function(walletAddress = null) {
  const whereClause = walletAddress ? { walletAddress } : {};
  
  return this.findAll({
    where: whereClause,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'completed' THEN 1 END")), 'completedTransactions'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'failed' THEN 1 END")), 'failedTransactions'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'pending' THEN 1 END")), 'pendingTransactions'],
      [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'completed' THEN amount_usd ELSE 0 END")), 'totalAmountUsd'],
      [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'completed' THEN amount_kes ELSE 0 END")), 'totalAmountKes']
    ],
    raw: true
  });
};

export default MpesaTransaction;
