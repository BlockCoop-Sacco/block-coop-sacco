import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import { GaslessTransaction } from '../models/GaslessTransaction.js';
import { sequelize } from '../database/connection.js';

/**
 * Gasless Transaction Relayer Service
 * Handles relaying signed transactions to the blockchain
 */
class GaslessRelayerService {
  constructor() {
    this.provider = null;
    this.relayerWallet = null;
    this.forwarderContract = null;
    this.packageManagerContract = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the relayer service
   */
  async initialize() {
    try {
      // Initialize BSC provider
      this.provider = new ethers.JsonRpcProvider(
        process.env.BSC_MAINNET_RPC || 'https://bsc-dataseed1.binance.org/'
      );

      // Initialize relayer wallet
      const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
      if (!relayerPrivateKey) {
        throw new Error('RELAYER_PRIVATE_KEY not found in environment variables');
      }

      this.relayerWallet = new ethers.Wallet(relayerPrivateKey, this.provider);
      logger.info(`Relayer wallet initialized: ${this.relayerWallet.address}`);

      // Initialize contracts
      const forwarderAddress = process.env.FORWARDER_ADDRESS;
      const packageManagerAddress = process.env.GASLESS_PACKAGE_MANAGER_ADDRESS;

      if (!forwarderAddress || !packageManagerAddress) {
        throw new Error('Contract addresses not found in environment variables');
      }

      // Load contract ABIs
      const forwarderABI = await this.loadContractABI('MinimalForwarder');
      const packageManagerABI = await this.loadContractABI('GaslessPackageManager');

      this.forwarderContract = new ethers.Contract(
        forwarderAddress,
        forwarderABI,
        this.relayerWallet
      );

      this.packageManagerContract = new ethers.Contract(
        packageManagerAddress,
        packageManagerABI,
        this.relayerWallet
      );

      this.isInitialized = true;
      logger.info('Gasless relayer service initialized successfully');

      // Check relayer balance
      const balance = await this.relayerWallet.getBalance();
      logger.info(`Relayer wallet balance: ${ethers.formatEther(balance)} BNB`);

      return true;
    } catch (error) {
      logger.error('Failed to initialize gasless relayer service:', error);
      throw error;
    }
  }

  /**
   * Load contract ABI from artifacts
   */
  async loadContractABI(contractName) {
    try {
      // Try to load from artifacts directory
      const artifactsPath = `../../artifacts/contracts/${contractName}.sol/${contractName}.json`;
      const { abi } = await import(artifactsPath);
      return abi;
    } catch (error) {
      logger.warn(`Could not load ABI for ${contractName}, using minimal ABI`);
      // Fallback to minimal ABI
      return this.getMinimalABI(contractName);
    }
  }

  /**
   * Get minimal ABI for contracts
   */
  getMinimalABI(contractName) {
    if (contractName === 'MinimalForwarder') {
      return [
        'function execute(tuple(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntil) req, bytes signature) external payable returns (bool, bytes)',
        'function getNonce(address from) external view returns (uint256)',
        'function verify(tuple(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntil) req, bytes signature) external view returns (bool)'
      ];
    } else if (contractName === 'GaslessPackageManager') {
      return [
        'function executeGaslessPurchase(uint256 packageId, uint256 usdtAmount, address referrer, uint256 deadline, bytes signature) external returns (bool)',
        'function getUserNonce(address user) external view returns (uint256)'
      ];
    }
    return [];
  }

  /**
   * Relay a gasless transaction
   */
  async relayTransaction(transactionData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const {
        from,
        to,
        value = 0,
        gas = process.env.GAS_LIMIT || 500000,
        nonce,
        data,
        validUntil = 0,
        signature,
        userWalletAddress,
        packageId,
        usdtAmount,
        referrer,
        deadline
      } = transactionData;

      // Validate transaction data
      if (!from || !to || !data || !signature) {
        throw new Error('Missing required transaction parameters');
      }

      // Check if transaction has expired
      if (validUntil > 0 && validUntil <= Math.floor(Date.now() / 1000)) {
        throw new Error('Transaction has expired');
      }

      // Verify signature
      const isValidSignature = await this.verifySignature(transactionData);
      if (!isValidSignature) {
        throw new Error('Invalid signature');
      }

      // Create forwarder request
      const forwardRequest = {
        from,
        to,
        value,
        gas,
        nonce,
        data,
        validUntil
      };

      // Execute transaction through forwarder
      const tx = await this.forwarderContract.execute(forwardRequest, signature, {
        gasLimit: gas,
        gasPrice: process.env.GAS_PRICE || ethers.parseUnits('1', 'gwei')
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      logger.info(`Transaction relayed successfully: ${receipt.transactionHash}`);

      // Log transaction in database
      await this.logRelayedTransaction(transactionData, receipt);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        status: 'success'
      };

    } catch (error) {
      logger.error('Failed to relay transaction:', error);
      
      // Log failed transaction
      await this.logRelayedTransaction(transactionData, null, error.message);

      throw error;
    }
  }

  /**
   * Relay a gasless package purchase
   */
  async relayPackagePurchase(purchaseData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const {
        userWalletAddress,
        packageId,
        usdtAmount,
        referrer = ethers.constants.AddressZero,
        deadline,
        signature
      } = purchaseData;

      // Validate purchase data
      if (!userWalletAddress || !packageId || !usdtAmount || !deadline || !signature) {
        throw new Error('Missing required purchase parameters');
      }

      // Check if purchase has expired
      if (deadline <= Math.floor(Date.now() / 1000)) {
        throw new Error('Purchase request has expired');
      }

      // Verify signature
      const isValidSignature = await this.verifyPurchaseSignature(purchaseData);
      if (!isValidSignature) {
        throw new Error('Invalid purchase signature');
      }

      // Execute gasless purchase
      const tx = await this.packageManagerContract.executeGaslessPurchase(
        packageId,
        usdtAmount,
        referrer,
        deadline,
        signature,
        {
          gasLimit: process.env.GAS_LIMIT || 500000,
          gasPrice: process.env.GAS_PRICE || ethers.parseUnits('1', 'gwei')
        }
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      logger.info(`Gasless purchase relayed successfully: ${receipt.transactionHash}`);

      // Log transaction in database
      await this.logRelayedTransaction({
        from: userWalletAddress,
        to: this.packageManagerContract.address,
        data: tx.data,
        signature,
        userWalletAddress,
        packageId,
        usdtAmount,
        referrer,
        deadline
      }, receipt);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        status: 'success'
      };

    } catch (error) {
      logger.error('Failed to relay package purchase:', error);
      
      // Log failed transaction
      await this.logRelayedTransaction({
        from: purchaseData.userWalletAddress,
        to: this.packageManagerContract.address,
        data: '0x',
        signature: purchaseData.signature,
        userWalletAddress: purchaseData.userWalletAddress,
        packageId: purchaseData.packageId,
        usdtAmount: purchaseData.usdtAmount,
        referrer: purchaseData.referrer,
        deadline: purchaseData.deadline
      }, null, error.message);

      throw error;
    }
  }

  /**
   * Verify transaction signature
   */
  async verifySignature(transactionData) {
    try {
      const { from, to, value, gas, nonce, data, validUntil, signature } = transactionData;

      const forwardRequest = {
        from,
        to,
        value,
        gas,
        nonce,
        data,
        validUntil
      };

      return await this.forwarderContract.verify(forwardRequest, signature);
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify purchase signature
   */
  async verifyPurchaseSignature(purchaseData) {
    try {
      // This would need to be implemented based on your specific signature verification logic
      // For now, we'll use a basic verification
      const message = ethers.solidityPackedKeccak256(
        ['uint256', 'uint256', 'address', 'uint256'],
        [purchaseData.packageId, purchaseData.usdtAmount, purchaseData.referrer, purchaseData.deadline]
      );

      const recoveredAddress = ethers.verifyMessage(ethers.getBytes(message), purchaseData.signature);
      return recoveredAddress.toLowerCase() === purchaseData.userWalletAddress.toLowerCase();
    } catch (error) {
      logger.error('Purchase signature verification failed:', error);
      return false;
    }
  }

  /**
   * Log relayed transaction in database
   */
  async logRelayedTransaction(transactionData, receipt, errorMessage = null) {
    try {
      const transactionLog = {
        userWalletAddress: transactionData.userWalletAddress,
        packageId: transactionData.packageId,
        usdtAmount: transactionData.usdtAmount,
        referrer: transactionData.referrer,
        deadline: transactionData.deadline,
        signature: transactionData.signature,
        transactionHash: receipt?.transactionHash || null,
        gasUsed: receipt?.gasUsed?.toString() || null,
        status: receipt ? 'success' : 'failed',
        errorMessage,
        relayedBy: this.relayerWallet.address,
        relayedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await GaslessTransaction.create(transactionLog);
      logger.info('Relayed transaction logged to database');
    } catch (error) {
      logger.error('Failed to log relayed transaction:', error);
    }
  }

  /**
   * Get relayer status
   */
  async getStatus() {
    if (!this.isInitialized) {
      return { initialized: false, message: 'Service not initialized' };
    }

    try {
      const balance = await this.relayerWallet.getBalance();
      const nonce = await this.relayerWallet.getTransactionCount();

      return {
        initialized: true,
        relayerAddress: this.relayerWallet.address,
        balance: ethers.utils.formatEther(balance),
        nonce,
        network: this.provider.network?.name || 'unknown'
      };
    } catch (error) {
      logger.error('Failed to get relayer status:', error);
      return { initialized: true, error: error.message };
    }
  }
}

// Create singleton instance
const gaslessRelayer = new GaslessRelayerService();

export default gaslessRelayer;
