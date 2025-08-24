import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import { BlockchainError } from '../middleware/errorHandler.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import ABIs via require to avoid import assertion issues
const packageManagerABI = require('../abi/PackageManager.json');
const usdtABI = require('../abi/USDT.json');

import '../config/env.js';

// env loaded via ../config/env.js

class BlockchainService {
  constructor() {
    this.rpcUrl = process.env.BSC_RPC_URL;
    this.privateKey = process.env.PRIVATE_KEY;
    this.packageManagerAddress = process.env.PACKAGE_MANAGER_ADDRESS;
    this.usdtAddress = process.env.USDT_ADDRESS;
    this.chainId = parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '56');

    // Validate configuration
    this.validateConfiguration();

    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);

    // Initialize contracts
    this.packageManager = new ethers.Contract(
      this.packageManagerAddress,
      packageManagerABI.abi,
      this.wallet
    );

    this.usdtToken = new ethers.Contract(
      this.usdtAddress,
      usdtABI.abi,
      this.wallet
    );

    // Transaction retry configuration
    this.maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
    this.retryDelay = parseInt(process.env.RETRY_DELAY || '5000');

    logger.info('Blockchain service initialized:', {
      network: this.chainId === 56 ? 'BSC Mainnet' : 'BSC Testnet',
      wallet: this.wallet.address,
      packageManager: this.packageManagerAddress,
      usdt: this.usdtAddress,
      chainId: this.chainId
    });
  }

  // Validate blockchain configuration
  validateConfiguration() {
    const requiredVars = [
      'BSC_RPC_URL',
      'PRIVATE_KEY',
      'PACKAGE_MANAGER_ADDRESS',
      'USDT_ADDRESS'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      throw new BlockchainError(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate addresses
    if (!ethers.isAddress(this.packageManagerAddress)) {
      throw new BlockchainError('Invalid PACKAGE_MANAGER_ADDRESS');
    }

    if (!ethers.isAddress(this.usdtAddress)) {
      throw new BlockchainError('Invalid USDT_ADDRESS');
    }

    // Validate private key
    try {
      new ethers.Wallet(this.privateKey);
    } catch (error) {
      throw new BlockchainError('Invalid PRIVATE_KEY');
    }
  }

  // Execute package purchase on behalf of user after M-Pesa payment
  async executePurchase(transaction, retryCount = 0) {
    const { walletAddress, packageId, amountUsd, referrerAddress } = transaction;

    try {
      logger.info('Executing blockchain purchase:', {
        transactionId: transaction.id,
        walletAddress,
        packageId,
        amountUsd,
        retryCount
      });

      // Validate inputs
      await this.validatePurchaseInputs(packageId, amountUsd, walletAddress);

      // Get package entry cost from chain (authoritative)
      const pkg = await this.getPackageDetails(packageId);
      const usdtAmount = pkg.entryUSDT; // BigInt (18 decimals)

      // Check network connectivity and gas prices
      await this.checkNetworkStatus();

      // Check treasury balance for required USDT
      await this.checkTreasuryBalance(usdtAmount);

      // Execute the purchase with retry logic
      const result = await this.executePurchaseTransaction(
        packageId,
        usdtAmount,
        referrerAddress,
        walletAddress
      );

      // Update transaction record with blockchain details
      await transaction.update({
        blockchainTxHash: result.txHash,
        status: 'completed'
      });

      logger.info('Blockchain purchase completed successfully:', {
        transactionId: transaction.id,
        txHash: result.txHash,
        blockNumber: result.blockNumber
      });

      return result;

    } catch (error) {
      logger.error('Blockchain purchase failed:', {
        transactionId: transaction.id,
        error: error.message,
        retryCount
      });

      // Handle retryable errors
      if (this.isRetryableError(error) && retryCount < this.maxRetries) {
        logger.info(`Retrying blockchain purchase (attempt ${retryCount + 1}/${this.maxRetries})`);

        // Wait before retry
        await this.delay(this.retryDelay * (retryCount + 1));

        return this.executePurchase(transaction, retryCount + 1);
      }

      // Update transaction with error
      await transaction.update({
        status: 'failed',
        errorMessage: error.message,
        retryCount,
        lastRetryAt: new Date()
      });

      throw new BlockchainError(`Blockchain purchase failed: ${error.message}`, 500, {
        transactionId: transaction.id,
        retryCount,
        originalError: error.message
      });
    }
  }

  // Execute the actual purchase transaction
  async executePurchaseTransaction(packageId, usdtAmount, referrerAddress, walletAddress) {
    try {
      // Step 1: Check current allowance
      const currentAllowance = await this.usdtToken.allowance(this.wallet.address, this.packageManagerAddress);

      // Step 2: Approve USDT if needed
      if (currentAllowance < usdtAmount) {
        logger.info('Approving USDT for PackageManager...', {
          currentAllowance: ethers.formatUnits(currentAllowance, 18),
          required: ethers.formatUnits(usdtAmount, 18)
        });

        const approveTx = await this.usdtToken.approve(this.packageManagerAddress, usdtAmount, {
          gasLimit: 100000 // Set reasonable gas limit
        });
        await approveTx.wait();

        logger.info('USDT approved:', {
          txHash: approveTx.hash,
          amount: ethers.formatUnits(usdtAmount, 18)
        });
      }

      // Step 3: Purchase package
      logger.info('Purchasing package...', {
        packageId,
        referrer: referrerAddress || ethers.ZeroAddress,
        beneficiary: walletAddress
      });

      const referrer = referrerAddress || ethers.ZeroAddress;

      // Estimate gas first
      const gasEstimate = await this.packageManager.purchase.estimateGas(packageId, referrer);
      const gasLimit = gasEstimate + (gasEstimate * 20n / 100n); // Add 20% buffer

      const purchaseTx = await this.packageManager.purchase(packageId, referrer, {
        gasLimit
      });

      const receipt = await purchaseTx.wait();

      logger.info('Package purchased successfully:', {
        txHash: purchaseTx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasLimit: gasLimit.toString()
      });

      // Parse events to get purchase details
      const purchaseEvent = receipt.logs.find(log => {
        try {
          const parsed = this.packageManager.interface.parseLog(log);
          return parsed.name === 'Purchased';
        } catch {
          return false;
        }
      });

      if (purchaseEvent) {
        const parsed = this.packageManager.interface.parseLog(purchaseEvent);
        logger.info('Purchase event details:', {
          buyer: parsed.args.buyer,
          packageId: parsed.args.packageId.toString(),
          usdtAmount: ethers.formatUnits(parsed.args.usdtAmount, 18),
          totalTokens: ethers.formatUnits(parsed.args.totalTokens, 18)
        });
      }

      return {
        success: true,
        txHash: purchaseTx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error('Purchase transaction failed:', {
        error: error.message,
        code: error.code,
        reason: error.reason
      });
      throw error;
    }
  }

  // Validate purchase inputs
  async validatePurchaseInputs(packageId, amountUsd, walletAddress) {
    if (!packageId || packageId < 1) {
      throw new BlockchainError('Invalid package ID');
    }

    if (!amountUsd || amountUsd <= 0) {
      throw new BlockchainError('Invalid amount');
    }

    if (!ethers.isAddress(walletAddress)) {
      throw new BlockchainError('Invalid wallet address');
    }
  }

  // Check network status and gas prices
  async checkNetworkStatus() {
    try {
      const network = await this.provider.getNetwork();
      const gasPrice = await this.provider.getFeeData();

      logger.debug('Network status:', {
        chainId: network.chainId.toString(),
        gasPrice: gasPrice.gasPrice?.toString(),
        maxFeePerGas: gasPrice.maxFeePerGas?.toString()
      });

      // Check if gas price is reasonable
      if (gasPrice.gasPrice && gasPrice.gasPrice > ethers.parseUnits('20', 'gwei')) {
        logger.warn('High gas prices detected:', {
          gasPrice: ethers.formatUnits(gasPrice.gasPrice, 'gwei') + ' gwei'
        });
      }

    } catch (error) {
      throw new BlockchainError(`Network connectivity issue: ${error.message}`);
    }
  }

  // Check treasury USDT balance
  async checkTreasuryBalance(requiredAmount) {
    try {
      const balance = await this.usdtToken.balanceOf(this.wallet.address);

      logger.debug('Treasury balance check:', {
        required: ethers.formatUnits(requiredAmount, 18),
        available: ethers.formatUnits(balance, 18),
        sufficient: balance >= requiredAmount
      });

      if (balance < requiredAmount) {
        throw new BlockchainError(
          `Insufficient treasury USDT balance. Required: ${ethers.formatUnits(requiredAmount, 18)}, Available: ${ethers.formatUnits(balance, 18)}`
        );
      }

      return balance;
    } catch (error) {
      if (error instanceof BlockchainError) {
        throw error;
      }
      throw new BlockchainError(`Failed to check treasury balance: ${error.message}`);
    }
  }

  // Check if error is retryable
  isRetryableError(error) {
    const retryableErrors = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'replacement fee too low',
      'nonce too low',
      'insufficient funds for gas'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  // Delay helper for retries
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get package details from blockchain
  async getPackageDetails(packageId) {
    try {
      const packageData = await this.packageManager.getPackage(packageId);

      return {
        id: packageId,
        entryUSDT: packageData.entryUSDT,
        exchangeRate: packageData.exchangeRate,
        vestBps: packageData.vestBps,
        cliff: packageData.cliff,
        duration: packageData.duration,
        active: packageData.active
      };
    } catch (error) {
      logger.error('Failed to get package details:', error);
      throw error;
    }
  }

  // Check USDT balance of service wallet
  async getServiceWalletBalance() {
    try {
      const balance = await this.usdtToken.balanceOf(this.wallet.address);
      return {
        address: this.wallet.address,
        balance: ethers.formatUnits(balance, 18),
        balanceWei: balance.toString()
      };
    } catch (error) {
      logger.error('Failed to get wallet balance:', error);
      throw error;
    }
  }

  // Estimate gas for package purchase
  async estimatePurchaseGas(packageId, referrer = ethers.ZeroAddress) {
    try {
      const gasEstimate = await this.packageManager.purchase.estimateGas(packageId, referrer);
      const gasPrice = await this.provider.getFeeData();

      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: gasPrice.gasPrice.toString(),
        estimatedCost: ethers.formatEther(gasEstimate * gasPrice.gasPrice)
      };
    } catch (error) {
      logger.error('Gas estimation failed:', error);
      throw error;
    }
  }

  // Monitor blockchain events
  setupEventListeners() {
    // Listen for package purchases
    this.packageManager.on('Purchased', (buyer, packageId, usdtAmount, totalTokens, vestTokens, poolTokens, lpTokens, referrer, referralReward, event) => {
      logger.info('Package purchase detected:', {
        buyer,
        packageId: packageId.toString(),
        usdtAmount: ethers.formatUnits(usdtAmount, 18),
        totalTokens: ethers.formatUnits(totalTokens, 18),
        txHash: event.transactionHash
      });
    });

    logger.info('Blockchain event listeners setup complete');
  }
}

export default new BlockchainService();
