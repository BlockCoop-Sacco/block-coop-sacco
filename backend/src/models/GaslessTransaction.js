import { DataTypes } from 'sequelize';
import { sequelize } from '../database/connection.js';

/**
 * GaslessTransaction Model
 * Tracks all gasless transactions relayed through the system
 */
export const GaslessTransaction = sequelize.define('GaslessTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // User information
  userWalletAddress: {
    type: DataTypes.STRING(42),
    allowNull: false,
    comment: 'User wallet address that signed the transaction'
  },
  
  // Package information
  packageId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the package being purchased (if applicable)'
  },
  
  usdtAmount: {
    type: DataTypes.DECIMAL(20, 6),
    allowNull: true,
    comment: 'Amount of USDT in the transaction'
  },
  
  referrer: {
    type: DataTypes.STRING(42),
    allowNull: true,
    comment: 'Referrer address (if applicable)'
  },
  
  // Transaction details
  deadline: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Unix timestamp when the transaction expires'
  },
  
  signature: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'User signature for the transaction'
  },
  
  transactionHash: {
    type: DataTypes.STRING(66),
    allowNull: true,
    comment: 'Blockchain transaction hash after relay'
  },
  
  gasUsed: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Gas used for the relayed transaction'
  },
  
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed', 'expired'),
    defaultValue: 'pending',
    allowNull: false,
    comment: 'Current status of the transaction'
  },
  
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if transaction failed'
  },
  
  // Relayer information
  relayedBy: {
    type: DataTypes.STRING(42),
    allowNull: false,
    comment: 'Address of the relayer wallet'
  },
  
  relayedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When the transaction was relayed'
  },
  
  // Metadata
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'gasless_transactions',
  timestamps: true,
  indexes: [
    {
      name: 'idx_user_wallet_address',
      fields: ['userWalletAddress']
    },
    {
      name: 'idx_package_id',
      fields: ['packageId']
    },
    {
      name: 'idx_status',
      fields: ['status']
    },
    {
      name: 'idx_transaction_hash',
      fields: ['transactionHash'],
      unique: true
    },
    {
      name: 'idx_relayed_at',
      fields: ['relayedAt']
    },
    {
      name: 'idx_user_status',
      fields: ['userWalletAddress', 'status']
    },
    {
      name: 'idx_deadline',
      fields: ['deadline']
    }
  ]
});

/**
 * Instance methods
 */
GaslessTransaction.prototype.isExpired = function() {
  if (!this.deadline) return false;
  return this.deadline <= Math.floor(Date.now() / 1000);
};

GaslessTransaction.prototype.canBeRetried = function() {
  return this.status === 'failed' && !this.isExpired();
};

/**
 * Class methods
 */
GaslessTransaction.findByUser = function(userWalletAddress, options = {}) {
  return this.findAll({
    where: { userWalletAddress },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

GaslessTransaction.findPending = function() {
  return this.findAll({
    where: { status: 'pending' },
    order: [['createdAt', 'ASC']]
  });
};

GaslessTransaction.findExpired = function() {
  const now = Math.floor(Date.now() / 1000);
  return this.findAll({
    where: {
      deadline: { [sequelize.Op.lte]: now },
      status: 'pending'
    }
  });
};

GaslessTransaction.findByTransactionHash = function(transactionHash) {
  return this.findOne({
    where: { transactionHash }
  });
};

/**
 * Hooks
 */
GaslessTransaction.beforeCreate(async (transaction) => {
  // Validate wallet address format
  if (transaction.userWalletAddress && !/^0x[a-fA-F0-9]{40}$/.test(transaction.userWalletAddress)) {
    throw new Error('Invalid wallet address format');
  }
  
  // Validate referrer address format if provided
  if (transaction.referrer && !/^0x[a-fA-F0-9]{40}$/.test(transaction.referrer)) {
    throw new Error('Invalid referrer address format');
  }
  
  // Set default deadline if not provided (5 minutes from now)
  if (!transaction.deadline) {
    transaction.deadline = Math.floor(Date.now() / 1000) + 300;
  }
});

GaslessTransaction.beforeUpdate(async (transaction) => {
  // Update the updatedAt timestamp
  transaction.updatedAt = new Date();
  
  // If status is being updated to failed, ensure errorMessage is set
  if (transaction.status === 'failed' && !transaction.errorMessage) {
    transaction.errorMessage = 'Unknown error occurred';
  }
});

/**
 * Associations (if needed)
 */
// GaslessTransaction.belongsTo(Package, { foreignKey: 'packageId' });
// GaslessTransaction.belongsTo(User, { foreignKey: 'userWalletAddress' });

export default GaslessTransaction;








