import { ethers } from 'ethers';
import { createRequire } from 'module';
import logger from '../config/logger.js';

// Import ABI files using createRequire for JSON imports
const require = createRequire(import.meta.url);
const packageManagerAbi = require('../abi/PackageManagerV2_1.json');
const erc20Abi = require('../abi/ERC20.json');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.treasuryWallet = null;
    this.contracts = {};
    this.initialized = false;
  }

  // Initialize blockchain connection
  async initialize() {
    try {
      if (this.initialized) return;

      // Create provider
      this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
      
      // Create treasury wallet from private key
      if (!process.env.TREASURY_PRIVATE_KEY) {
        throw new Error('TREASURY_PRIVATE_KEY not configured');
      }
      
      this.treasuryWallet = new ethers.Wallet(process.env.TREASURY_PRIVATE_KEY, this.provider);
      
      // Initialize contracts
      this.contracts = {
        packageManager: new ethers.Contract(
          process.env.PACKAGE_MANAGER_CONTRACT_ADDRESS,
          packageManagerAbi.abi || packageManagerAbi,
          this.treasuryWallet
        ),
        usdt: new ethers.Contract(
          process.env.USDT_CONTRACT_ADDRESS,
          erc20Abi.abi || erc20Abi,
          this.treasuryWallet
        )
      };

      // Verify connection
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(this.treasuryWallet.address);
      
      logger.info('Blockchain service initialized', {
        network: network.name,
        chainId: network.chainId.toString(),
        treasuryAddress: this.treasuryWallet.address,
        treasuryBalance: ethers.formatEther(balance)
      });

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  // Get package details from smart contract
  async getPackageDetails(packageId) {
    try {
      await this.initialize();
      
      const packageData = await this.contracts.packageManager.getPackage(packageId);
      
      return {
        id: packageId,
        name: packageData.name,
        entryUSDT: packageData.entryUSDT,
        exchangeRate: packageData.exchangeRate,
        vestBps: packageData.vestBps,
        cliff: packageData.cliff,
        duration: packageData.duration,
        referralBps: packageData.referralBps,
        active: packageData.active,
        exists: packageData.exists
      };
    } catch (error) {
      logger.error('Error getting package details:', error);
      throw error;
    }
  }

  // Check USDT balance of treasury
  async getTreasuryUSDTBalance() {
    try {
      await this.initialize();
      
      const balance = await this.contracts.usdt.balanceOf(this.treasuryWallet.address);
      return balance;
    } catch (error) {
      logger.error('Error getting treasury USDT balance:', error);
      throw error;
    }
  }

  // Execute package purchase on behalf of user
  async executePurchaseForUser(userAddress, packageId, referrerAddress = null) {
    try {
      await this.initialize();

      // Get package details
      const packageData = await this.getPackageDetails(packageId);
      
      if (!packageData.exists || !packageData.active) {
        throw new Error('Package not found or not active');
      }

      // Check treasury has enough USDT
      const treasuryBalance = await this.getTreasuryUSDTBalance();
      if (treasuryBalance < packageData.entryUSDT) {
        throw new Error('Insufficient USDT in treasury for purchase');
      }

      // Approve USDT spending if needed
      const currentAllowance = await this.contracts.usdt.allowance(
        this.treasuryWallet.address,
        this.contracts.packageManager.target
      );

      if (currentAllowance < packageData.entryUSDT) {
        logger.info('Approving USDT spending for package purchase');
        const approveTx = await this.contracts.usdt.approve(
          this.contracts.packageManager.target,
          ethers.MaxUint256
        );
        await approveTx.wait();
        logger.info('USDT approval completed', { txHash: approveTx.hash });
      }

      // Execute purchase
      const referrer = referrerAddress || ethers.ZeroAddress;
      
      logger.info('Executing package purchase', {
        userAddress,
        packageId,
        referrer,
        entryUSDT: packageData.entryUSDT.toString()
      });

      const purchaseTx = await this.contracts.packageManager.purchase(packageId, referrer);
      const receipt = await purchaseTx.wait();

      logger.info('Package purchase completed', {
        txHash: purchaseTx.hash,
        gasUsed: receipt.gasUsed.toString(),
        userAddress,
        packageId
      });

      // Parse events to get purchase details
      const purchaseEvent = receipt.logs.find(log => {
        try {
          const parsed = this.contracts.packageManager.interface.parseLog(log);
          return parsed.name === 'PackagePurchased';
        } catch {
          return false;
        }
      });

      let eventData = null;
      if (purchaseEvent) {
        const parsed = this.contracts.packageManager.interface.parseLog(purchaseEvent);
        eventData = {
          user: parsed.args.user,
          packageId: parsed.args.packageId.toString(),
          entryUSDT: parsed.args.entryUSDT.toString(),
          referrer: parsed.args.referrer
        };
      }

      return {
        success: true,
        txHash: purchaseTx.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
        eventData
      };
    } catch (error) {
      logger.error('Error executing package purchase:', error);
      throw error;
    }
  }

  // Transfer tokens to user (for manual distribution if needed)
  async transferTokensToUser(userAddress, tokenAddress, amount) {
    try {
      await this.initialize();

      const tokenContract = new ethers.Contract(
        tokenAddress,
        erc20Abi.abi || erc20Abi,
        this.treasuryWallet
      );

      const transferTx = await tokenContract.transfer(userAddress, amount);
      const receipt = await transferTx.wait();

      logger.info('Token transfer completed', {
        txHash: transferTx.hash,
        userAddress,
        tokenAddress,
        amount: amount.toString()
      });

      return {
        success: true,
        txHash: transferTx.hash,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error('Error transferring tokens:', error);
      throw error;
    }
  }

  // Get transaction receipt
  async getTransactionReceipt(txHash) {
    try {
      await this.initialize();
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      logger.error('Error getting transaction receipt:', error);
      throw error;
    }
  }

  // Estimate gas for package purchase
  async estimateGasForPurchase(packageId, referrerAddress = null) {
    try {
      await this.initialize();
      
      const referrer = referrerAddress || ethers.ZeroAddress;
      const gasEstimate = await this.contracts.packageManager.purchase.estimateGas(packageId, referrer);
      
      return gasEstimate;
    } catch (error) {
      logger.error('Error estimating gas:', error);
      throw error;
    }
  }
}

export default new BlockchainService();
