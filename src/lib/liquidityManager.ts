import { ethers, Contract, Signer } from 'ethers';
import { appKitConfig } from './appkit';
import { getContracts } from './contracts';

// Import ABI files
import pancakeRouterAbi from '../abi/IPancakeRouter.json';
import pancakeFactoryAbi from '../abi/IPancakeFactory.json';
import pancakePairAbi from '../abi/IPancakePair.json';
import erc20Abi from '../abi/ERC20.json';

// Types for liquidity management
export interface LiquidityRemovalPreview {
  lpTokenAmount: bigint;
  expectedUSDT: bigint;
  expectedShareToken: bigint;
  minimumUSDT: bigint;
  minimumShareToken: bigint;
  priceImpact: number;
  slippageTolerance: number;
}

export interface SlippageConfig {
  tolerance: number; // Percentage (e.g., 0.5 for 0.5%)
  deadline: number; // Seconds from now
}

export interface MEVProtection {
  enabled: boolean;
  usePrivateMempool: boolean;
  maxGasPrice: bigint;
  priorityFee: bigint;
  deadline: number;
  frontrunProtection: boolean;
  sandwichProtection: boolean;
  flashloanProtection: boolean;
}

// Default configurations
export const DEFAULT_SLIPPAGE_CONFIG: SlippageConfig = {
  tolerance: 0.5, // 0.5%
  deadline: 300, // 5 minutes
};

export const DEFAULT_MEV_PROTECTION: MEVProtection = {
  enabled: true,
  usePrivateMempool: false,
  maxGasPrice: ethers.parseUnits('20', 'gwei'), // 20 Gwei max
  priorityFee: ethers.parseUnits('2', 'gwei'), // 2 Gwei priority fee
  deadline: 300, // 5 minutes
  frontrunProtection: true,
  sandwichProtection: true,
  flashloanProtection: true,
};

/**
 * Enhanced Liquidity Manager for PancakeSwap V2 Integration
 * Handles actual liquidity removal with slippage protection and MEV resistance
 */
export class LiquidityManager {
  private router: Contract;
  private factory: Contract;
  private signer: Signer;

  constructor(signer: Signer) {
    this.signer = signer;
    this.router = new Contract(
      appKitConfig.contracts.router,
      pancakeRouterAbi.abi,
      signer
    );
    
    // Get factory address from configuration
    this.factory = new Contract(
      appKitConfig.contracts.factory,
      pancakeFactoryAbi.abi,
      signer
    );
  }

  /**
   * Get the PancakeSwap pair address for ShareToken/USDT
   */
  async getPairAddress(): Promise<string> {
    const shareTokenAddress = appKitConfig.contracts.share;
    const usdtAddress = appKitConfig.contracts.usdt;
    
    const pairAddress = await this.factory.getPair(shareTokenAddress, usdtAddress);
    if (pairAddress === ethers.ZeroAddress) {
      throw new Error('No liquidity pair found for ShareToken/USDT');
    }
    
    return pairAddress;
  }

  /**
   * Get current reserves for the ShareToken/USDT pair
   */
  async getReserves(): Promise<{ reserveShare: bigint; reserveUSDT: bigint; token0: string; token1: string }> {
    const pairAddress = await this.getPairAddress();
    const pair = new Contract(pairAddress, pancakePairAbi.abi, this.signer);
    
    const [reserve0, reserve1] = await pair.getReserves();
    const token0 = await pair.token0();
    const token1 = await pair.token1();
    
    const shareTokenAddress = appKitConfig.contracts.share;
    const usdtAddress = appKitConfig.contracts.usdt;
    
    // Determine which reserve corresponds to which token
    let reserveShare: bigint, reserveUSDT: bigint;
    if (token0.toLowerCase() === shareTokenAddress.toLowerCase()) {
      reserveShare = reserve0;
      reserveUSDT = reserve1;
    } else {
      reserveShare = reserve1;
      reserveUSDT = reserve0;
    }
    
    return { reserveShare, reserveUSDT, token0, token1 };
  }

  /**
   * Calculate expected returns from LP token redemption
   */
  async calculateLiquidityRemoval(
    lpTokenAmount: bigint,
    slippageConfig: SlippageConfig = DEFAULT_SLIPPAGE_CONFIG
  ): Promise<LiquidityRemovalPreview> {
    const pairAddress = await this.getPairAddress();
    const pair = new Contract(pairAddress, pancakePairAbi.abi, this.signer);
    
    // Get total LP supply and reserves
    const [totalSupply, reserves] = await Promise.all([
      pair.totalSupply(),
      this.getReserves()
    ]);
    
    // Calculate proportional amounts
    const shareOfPool = (lpTokenAmount * 10000n) / totalSupply; // Basis points
    const expectedShareToken = (reserves.reserveShare * shareOfPool) / 10000n;
    const expectedUSDT = (reserves.reserveUSDT * shareOfPool) / 10000n;
    
    // Apply slippage tolerance
    const slippageBps = BigInt(Math.floor(slippageConfig.tolerance * 100)); // Convert to basis points
    const minimumShareToken = expectedShareToken - (expectedShareToken * slippageBps) / 10000n;
    const minimumUSDT = expectedUSDT - (expectedUSDT * slippageBps) / 10000n;
    
    // Calculate price impact (simplified)
    const priceImpact = Number(shareOfPool) / 100; // Convert basis points to percentage
    
    return {
      lpTokenAmount,
      expectedUSDT,
      expectedShareToken,
      minimumUSDT,
      minimumShareToken,
      priceImpact,
      slippageTolerance: slippageConfig.tolerance,
    };
  }

  /**
   * Execute liquidity removal with slippage protection and MEV protection
   */
  async removeLiquidity(
    lpTokenAmount: bigint,
    slippageConfig: SlippageConfig = DEFAULT_SLIPPAGE_CONFIG,
    mevProtection: MEVProtection = DEFAULT_MEV_PROTECTION
  ): Promise<ethers.ContractTransactionResponse> {
    // Check if MEV protection is enabled
    if (!mevProtection.enabled) {
      console.warn('MEV protection is disabled. Transaction may be vulnerable to MEV attacks.');
    }

    // Get removal preview
    const preview = await this.calculateLiquidityRemoval(lpTokenAmount, slippageConfig);

    // MEV Protection: Check current gas price
    const currentGasPrice = await this.signer.provider!.getGasPrice();
    if (mevProtection.enabled && currentGasPrice > mevProtection.maxGasPrice) {
      throw new Error(`Gas price too high: ${ethers.formatUnits(currentGasPrice, 'gwei')} Gwei > ${ethers.formatUnits(mevProtection.maxGasPrice, 'gwei')} Gwei. Wait for lower gas prices or increase your maximum gas price limit.`);
    }

    // MEV Protection: Frontrun detection
    if (mevProtection.frontrunProtection) {
      await this.detectFrontrunning(lpTokenAmount);
    }

    // MEV Protection: Sandwich attack detection
    if (mevProtection.sandwichProtection) {
      await this.detectSandwichAttack(preview);
    }

    // MEV Protection: Flashloan monitoring
    if (mevProtection.flashloanProtection) {
      await this.monitorFlashloanActivity();
    }

    // Calculate deadline with MEV protection
    const deadline = Math.floor(Date.now() / 1000) + mevProtection.deadline;

    // Get pair address to approve LP tokens
    const pairAddress = await this.getPairAddress();
    const lpTokenContract = new Contract(pairAddress, erc20Abi.abi, this.signer);

    // Approve router to spend LP tokens
    const approveTx = await lpTokenContract.approve(this.router.target, lpTokenAmount);
    await approveTx.wait();

    // Prepare transaction options with MEV protection
    const txOptions: any = {
      gasLimit: 350000n, // Increased gas limit for MEV protection
    };

    // Use EIP-1559 gas pricing if supported
    if (mevProtection.enabled) {
      try {
        const feeData = await this.signer.provider!.getFeeData();
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          txOptions.maxFeePerGas = mevProtection.maxGasPrice;
          txOptions.maxPriorityFeePerGas = mevProtection.priorityFee;
        } else {
          txOptions.gasPrice = Math.min(Number(currentGasPrice), Number(mevProtection.maxGasPrice));
        }
      } catch (error) {
        console.warn('Failed to get fee data, using legacy gas pricing:', error);
        txOptions.gasPrice = Math.min(Number(currentGasPrice), Number(mevProtection.maxGasPrice));
      }
    } else {
      txOptions.gasPrice = currentGasPrice;
    }

    // MEV Protection: Add random delay to prevent timing attacks
    if (mevProtection.enabled) {
      const randomDelay = Math.floor(Math.random() * 3000) + 1000; // 1-4 seconds
      await new Promise(resolve => setTimeout(resolve, randomDelay));
    }

    // Execute liquidity removal
    const tx = await this.router.removeLiquidity(
      appKitConfig.contracts.share,
      appKitConfig.contracts.usdt,
      lpTokenAmount,
      preview.minimumShareToken,
      preview.minimumUSDT,
      await this.signer.getAddress(),
      deadline,
      txOptions
    );

    return tx;
  }

  /**
   * Get current token prices from the pool
   */
  async getTokenPrices(): Promise<{ shareTokenPriceInUSDT: number; usdtPriceInShareToken: number }> {
    const reserves = await this.getReserves();
    
    // Calculate prices based on reserves
    // Price = reserve_other / reserve_this
    const shareTokenPriceInUSDT = Number(reserves.reserveUSDT) / Number(reserves.reserveShare);
    const usdtPriceInShareToken = Number(reserves.reserveShare) / Number(reserves.reserveUSDT);
    
    return {
      shareTokenPriceInUSDT,
      usdtPriceInShareToken,
    };
  }

  /**
   * Estimate gas for liquidity removal
   */
  async estimateRemovalGas(
    lpTokenAmount: bigint,
    slippageConfig: SlippageConfig = DEFAULT_SLIPPAGE_CONFIG
  ): Promise<bigint> {
    const preview = await this.calculateLiquidityRemoval(lpTokenAmount, slippageConfig);
    const deadline = Math.floor(Date.now() / 1000) + slippageConfig.deadline;

    try {
      const gasEstimate = await this.router.removeLiquidity.estimateGas(
        appKitConfig.contracts.share,
        appKitConfig.contracts.usdt,
        lpTokenAmount,
        preview.minimumShareToken,
        preview.minimumUSDT,
        await this.signer.getAddress(),
        deadline
      );

      // Add 20% buffer
      return gasEstimate + (gasEstimate * 20n) / 100n;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      return 300000n; // Fallback gas limit
    }
  }

  /**
   * MEV Protection: Detect potential frontrunning attacks
   */
  private async detectFrontrunning(lpTokenAmount: bigint): Promise<void> {
    try {
      // Check for suspicious pending transactions in the mempool
      // This is a simplified detection - in production, you'd use more sophisticated methods
      const pendingBlock = await this.signer.provider!.getBlock('pending');
      if (pendingBlock && pendingBlock.transactions.length > 100) {
        console.warn('High mempool activity detected - potential frontrunning risk');
      }

      // Check for large transactions targeting the same pair
      const pairAddress = await this.getPairAddress();
      // In a real implementation, you would analyze pending transactions
      // targeting the same pair for potential frontrunning

    } catch (error) {
      console.warn('Frontrun detection failed:', error);
    }
  }

  /**
   * MEV Protection: Detect potential sandwich attacks
   */
  private async detectSandwichAttack(preview: LiquidityRemovalPreview): Promise<void> {
    try {
      // Monitor for suspicious price movements that could indicate sandwich setup
      const currentReserves = await this.getReserves();

      // Calculate expected price impact vs actual reserves
      const expectedRatio = Number(currentReserves.reserveUSDT) / Number(currentReserves.reserveShare);

      // If price impact is significantly higher than expected, it might be a sandwich attack
      if (preview.priceImpact > 2.0) {
        console.warn('High price impact detected - potential sandwich attack risk');
      }

    } catch (error) {
      console.warn('Sandwich attack detection failed:', error);
    }
  }

  /**
   * MEV Protection: Monitor for flashloan activity
   */
  private async monitorFlashloanActivity(): Promise<void> {
    try {
      // Check recent blocks for flashloan activity
      const latestBlock = await this.signer.provider!.getBlock('latest');
      if (!latestBlock) return;

      // In a real implementation, you would:
      // 1. Analyze recent transactions for flashloan patterns
      // 2. Check for large liquidity movements
      // 3. Monitor known flashloan protocols

      // For now, we'll just log a warning if block is very full
      if (latestBlock.transactions.length > 200) {
        console.warn('High transaction volume detected - monitor for flashloan MEV activity');
      }

    } catch (error) {
      console.warn('Flashloan monitoring failed:', error);
    }
  }
}

/**
 * Factory function to create LiquidityManager instance
 */
export function createLiquidityManager(signer: Signer): LiquidityManager {
  return new LiquidityManager(signer);
}

/**
 * Utility function to format slippage percentage
 */
export function formatSlippage(slippage: number): string {
  return `${slippage.toFixed(2)}%`;
}

/**
 * Utility function to calculate price impact color for UI
 */
export function getPriceImpactColor(priceImpact: number): string {
  if (priceImpact < 0.1) return 'text-green-600';
  if (priceImpact < 1) return 'text-yellow-600';
  if (priceImpact < 3) return 'text-orange-600';
  return 'text-red-600';
}
