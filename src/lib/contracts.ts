import { ethers, JsonRpcProvider, BrowserProvider, Contract, Signer, Provider, TransactionReceipt } from 'ethers';
import { appKitConfig, isValidAddress } from './appkit';

// Import all ABI files
import packageManagerAbi from '../abi/PackageManager.json';
import vestingVaultAbi from '../abi/VestingVault.json';
import swapTaxManagerAbi from '../abi/SwapTaxManager.json';
import shareTokenAbi from '../abi/BLOCKS.json';
import lpTokenAbi from '../abi/BLOCKS_LP.json';
import erc20Abi from '../abi/ERC20.json';
import pancakeRouterAbi from '../abi/IPancakeRouter.json';
import pancakeFactoryAbi from '../abi/IPancakeFactory.json';
// import pancakePairAbi from '../abi/IPancakePair.json'; // Unused

// V2 Contract ABIs
import dividendDistributorAbi from '../abi/DividendDistributor.json';
import secondaryMarketAbi from '../abi/SecondaryMarket.json';
import stakingAbi from '../abi/BLOCKSStakingV2.json';

// Import liquidity management utilities
import { /* LiquidityManager, */ createLiquidityManager, LiquidityRemovalPreview, SlippageConfig, MEVProtection } from './liquidityManager';





// --- Inserted implementations for missing functions ---
export function getPackageDataDecimals(): { usdtDecimals: number; exchangeRateDecimals: number } {
  // For this deployment USDT and exchangeRate are both stored as 18-decimals.
  return { usdtDecimals: 18, exchangeRateDecimals: 18 };
}

export function scaleTo18(value: bigint, fromDecimals: number): bigint {
  const targetDecimals = 18;
  if (fromDecimals === targetDecimals) return value;
  if (fromDecimals < targetDecimals) {
    return value * 10n ** BigInt(targetDecimals - fromDecimals);
  } else {
    return value / 10n ** BigInt(fromDecimals - targetDecimals);
  }
}

export function safeDiv(numerator: bigint, denominator: bigint, fallback: bigint = 0n): bigint {
  if (!denominator || denominator === 0n) {
    return fallback;
  }
  return numerator / denominator;
}

export function calculateSplits(pkg: Package): PackageSplits {
  const { entryUSDT, exchangeRate } = pkg;

  if (entryUSDT === undefined || entryUSDT === null) {
    throw new Error('Package entryUSDT is required but undefined');
  }
  if (exchangeRate === undefined || exchangeRate === null) {
    throw new Error('Package exchangeRate is required but undefined');
  }

  const entryUSDTBig = BigInt(entryUSDT);           // 18-decimals
  const exchangeRateBig = BigInt(exchangeRate);     // 18-decimals (USDT per BLOCKS)

  // Default fallback split when on-chain reads are unavailable: 30% liquidity / 70% treasury
  const liquidityBps = 3000n;

  // Calculate total BLOCKS user receives from package exchange rate
  const totalUserTokens = exchangeRateBig === 0n ? 0n : (entryUSDTBig * (10n ** 18n)) / exchangeRateBig;

  // USDT split
  const usdtPool = (entryUSDTBig * liquidityBps) / 10000n;
  const usdtVault = entryUSDTBig - usdtPool;

  // Approximate token split proportional to USDT split (final values should use calculateSplitsWithTargetPrice)
  const poolTokens = (totalUserTokens * liquidityBps) / 10000n;
  const vestTokens = totalUserTokens - poolTokens;

  return {
    totalTokens: totalUserTokens,
    vestTokens,
    poolTokens,
    lpTokens: totalUserTokens,
    usdtPool,
    usdtVault,
  };
}

export async function calculateSplitsWithTargetPrice(pkg: Package): Promise<PackageSplits> {
  try {
    const contracts = getContracts();
    // Read global target price
    let globalTargetPrice: bigint;
    try {
      globalTargetPrice = BigInt(await contracts.packageManager.globalTargetPrice());
    } catch (err) {
      console.warn('Unable to read globalTargetPrice from chain, using 1.0 fallback', err);
      globalTargetPrice = 1000000000000000000n; // 1.0 USDT/BLOCKS (18-decimals)
    }

    // Read liquidityBps (fallback 3000 if not available in ABI)
    let liquidityBps: bigint = 3000n;
    try {
      liquidityBps = BigInt(await contracts.packageManager.liquidityBps());
    } catch (err) {
      console.warn('Unable to read liquidityBps; defaulting to 30%', err);
    }

    // Read market price with fallback to target
    let priceToUse: bigint = globalTargetPrice;
    try {
      const res = await contracts.packageManager.getCurrentMarketPrice();
      // Ethers v6: tuple as array [marketPrice, hasLiquidity]
      const marketPrice = BigInt(res[0]);
      const hasLiquidity = Boolean(res[1]);
      priceToUse = hasLiquidity && marketPrice > 0n ? marketPrice : globalTargetPrice;
    } catch (err) {
      console.warn('Unable to read market price; using target price');
    }

    // Pull package values
    const entryUSDTBig = BigInt(pkg.entryUSDT);
    const exchangeRateBig = BigInt(pkg.exchangeRate);

    if (exchangeRateBig === 0n || priceToUse === 0n) {
      console.warn('Invalid exchange rate or price; returning zeros');
      return { totalTokens: 0n, vestTokens: 0n, poolTokens: 0n, lpTokens: 0n, usdtPool: 0n, usdtVault: 0n };
    }

    // Total user tokens from package exchange rate (USDT per BLOCKS)
    const totalUserTokens = (entryUSDTBig * (10n ** 18n)) / exchangeRateBig;

    // USDT split by liquidityBps
    const usdtPool = (entryUSDTBig * liquidityBps) / 10000n;
    const usdtVault = entryUSDTBig - usdtPool;

    // Pool tokens based on chosen price (AMM if available; fallback target)
    const poolTokens = (usdtPool * (10n ** 18n)) / priceToUse;
    const vestTokens = totalUserTokens - poolTokens;

    return {
      totalTokens: totalUserTokens,
      vestTokens,
      poolTokens,
    lpTokens: totalUserTokens,
      usdtPool,
      usdtVault,
    };
  } catch (error) {
    console.error('Error calculating splits with target price:', error);
    return calculateSplits(pkg);
  }
}

export async function getLiquidityBps(): Promise<bigint> {
  try {
    const contracts = getContracts();
    return BigInt(await contracts.packageManager.liquidityBps());
  } catch {
    return 3000n;
  }
}

// Type definitions for contract instances (Ethers v6)
export type PackageManagerContract = Contract;
export type VestingVaultContract = Contract;
export type SwapTaxManagerContract = Contract;
export type ShareTokenContract = Contract;
export type LPTokenContract = Contract;
export type ERC20Contract = Contract;
export type PancakeRouterContract = Contract;

// Contract connection state
export interface ContractConnectionState {
  isConnected: boolean;
  hasValidConfig: boolean;
  errors: string[];
}

// Provider functions (Ethers v6) with RPC failover
export function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider(appKitConfig.rpcUrl, {
    chainId: appKitConfig.chainId,
    name: appKitConfig.chainId === 56 ? 'BSC Mainnet' : 'BSC Testnet'
  });
}

// Enhanced provider with RPC failover capability
export async function getProviderWithFailover(): Promise<JsonRpcProvider> {
  const networkConfig = appKitConfig.chainId === 56 ? 
    (await import('./appkit')).BSC_MAINNET : 
    (await import('./appkit')).BSC_TESTNET;
  
  const rpcUrls = (networkConfig as any).rpcUrls || [networkConfig.rpcUrl];
  
  for (const rpcUrl of rpcUrls) {
    try {
      console.log(`🔄 Trying RPC endpoint: ${rpcUrl}`);
      const provider = new JsonRpcProvider(rpcUrl, {
        chainId: appKitConfig.chainId,
        name: appKitConfig.chainId === 56 ? 'BSC Mainnet' : 'BSC Testnet'
      });
      
      // Test the connection with a simple call
      await provider.getBlockNumber();
      console.log(`✅ Successfully connected to RPC: ${rpcUrl}`);
      return provider;
    } catch (error) {
      console.warn(`❌ RPC endpoint failed: ${rpcUrl}`, error);
      continue;
    }
  }
  
  // If all RPCs fail, fall back to the original provider
  console.error('⚠️ All RPC endpoints failed, using fallback provider');
  return getProvider();
}

// DEPRECATED: Use useWeb3() hook instead for proper signer access
// This function is kept for backward compatibility but should not be used
export async function getSigner(): Promise<Signer | null> {
  console.warn('getSigner() is deprecated. Use useWeb3() hook to access signer from Web3Provider context.');

  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const provider = new BrowserProvider((window as any).ethereum);
      return await provider.getSigner();
    } catch (error) {
      console.error('Error getting signer:', error);
      return null;
    }
  }
  return null;
}

// Validate contract configuration
export function validateContractConfig(): ContractConnectionState {
  const errors: string[] = [];

  // Check if all contract addresses are valid
  const contractEntries = Object.entries(appKitConfig.contracts);
  contractEntries.forEach(([name, address]) => {
    if (!isValidAddress(address)) {
      errors.push(`Invalid ${name} contract address: ${address}`);
    }
  });

  // Check RPC URL
  if (!appKitConfig.rpcUrl) {
    errors.push('RPC URL is not configured');
  }

  return {
    isConnected: errors.length === 0,
    hasValidConfig: errors.length === 0,
    errors
  };
}

// Create typed contract instances (Ethers v6)
function createContractInstance<T extends Contract>(
  address: string,
  abi: any,
  signerOrProvider: Signer | Provider
): T {
  console.log('🔨 Creating contract instance:', {
    address,
    isValidAddress: isValidAddress(address),
    abiType: typeof abi,
    hasAbi: !!(abi.abi || abi),
    signerOrProviderType: signerOrProvider.constructor.name,
    contractType: address === '0x554a9631E00103cC97282D0BC27Ba0A9a4ab4A5E' ? 'STAKING' : 'OTHER'
  });

  if (!isValidAddress(address)) {
    throw new Error(`Invalid contract address: ${address}`);
  }

  const contract = new Contract(address, abi.abi || abi, signerOrProvider) as T;

  console.log('✅ Contract instance created:', {
    contractAddress: contract.address,
    contractTarget: (contract as any).target,
    hasAddress: !!contract.address
  });

  return contract;
}

// Main contract factory function (Ethers v6)
export function getContracts(signer?: Signer | null) {
  const signerOrProvider = signer || getProvider();

  console.log('🏗️ getContracts called with:', {
    hasSigner: !!signer,
    signerOrProviderType: signerOrProvider.constructor.name,
    appKitConfigExists: !!appKitConfig,
    contractsConfigExists: !!appKitConfig.contracts,
    contractAddresses: {
      packageManager: appKitConfig.contracts.packageManager,
      usdt: appKitConfig.contracts.usdt,
      vault: appKitConfig.contracts.vault,
      taxManager: appKitConfig.contracts.taxManager,
      share: appKitConfig.contracts.share,
      lp: appKitConfig.contracts.lp,
      router: appKitConfig.contracts.router
    },
    allContractAddressesValid: Object.values(appKitConfig.contracts).every(addr => !!addr && addr !== '')
  });

  try {
    const packageManagerContract = createContractInstance<PackageManagerContract>(
      appKitConfig.contracts.packageManager,
      packageManagerAbi,
      signerOrProvider
    );

    console.log('📋 PackageManager contract created:', {
      address: packageManagerContract.address,
      hasAddress: !!packageManagerContract.address
    });

    return {
      packageManager: packageManagerContract,
      vestingVault: createContractInstance<VestingVaultContract>(
        appKitConfig.contracts.vault,
        vestingVaultAbi,
        signerOrProvider
      ),
      taxManager: createContractInstance<SwapTaxManagerContract>(
        appKitConfig.contracts.taxManager,
        swapTaxManagerAbi,
        signerOrProvider
      ),
      shareToken: createContractInstance<ShareTokenContract>(
        appKitConfig.contracts.share,
        shareTokenAbi,
        signerOrProvider
      ),
      lpToken: createContractInstance<LPTokenContract>(
        appKitConfig.contracts.lp,
        lpTokenAbi,
        signerOrProvider
      ),
      router: createContractInstance<PancakeRouterContract>(
        appKitConfig.contracts.router,
        pancakeRouterAbi,
        signerOrProvider
      ),
      factory: createContractInstance<Contract>(
        appKitConfig.contracts.factory,
        pancakeFactoryAbi,
        signerOrProvider
      ),
      usdtToken: createContractInstance<ERC20Contract>(
        appKitConfig.contracts.usdt,
        erc20Abi,
        signerOrProvider
      ),
      // V2 Contracts
      dividendDistributor: appKitConfig.contracts.dividendDistributor ? createContractInstance<Contract>(
        appKitConfig.contracts.dividendDistributor,
        dividendDistributorAbi,
        signerOrProvider
      ) : null,
      secondaryMarket: appKitConfig.contracts.secondaryMarket ? createContractInstance<Contract>(
        appKitConfig.contracts.secondaryMarket,
        secondaryMarketAbi,
        signerOrProvider
      ) : null,
      staking: (() => {
        console.log('🎯 Staking contract creation check:', {
          stakingAddress: appKitConfig.contracts.staking,
          stakingAddressTruthy: !!appKitConfig.contracts.staking,
          stakingAddressType: typeof appKitConfig.contracts.staking,
          stakingAddressLength: appKitConfig.contracts.staking?.length || 0
        });
        return appKitConfig.contracts.staking ? createContractInstance<Contract>(
          appKitConfig.contracts.staking,
          stakingAbi,
          signerOrProvider
        ) : null;
      })(),
    };
  } catch (error) {
    console.error('❌ Error creating contract instances:', error);
    console.error('Contract addresses being used:', appKitConfig.contracts);
    console.error('Staking contract specifically:', {
      stakingAddress: appKitConfig.contracts.staking,
      stakingEnabled: !!appKitConfig.contracts.staking
    });
    throw error;
  }
}

// Async contract factory function with RPC failover (Ethers v6)
export async function getContractsWithFailover(signer?: Signer | null) {
  const signerOrProvider = signer || await getProviderWithFailover();

  console.log('🏗️ getContractsWithFailover called with:', {
    hasSigner: !!signer,
    signerOrProviderType: signerOrProvider.constructor.name,
    rpcUrl: (signerOrProvider as any)?.connection?.url || 'unknown',
    appKitConfigExists: !!appKitConfig,
    contractsConfigExists: !!appKitConfig.contracts
  });

  try {
    const packageManagerContract = createContractInstance<PackageManagerContract>(
      appKitConfig.contracts.packageManager,
      packageManagerAbi,
      signerOrProvider
    );

    console.log('📋 PackageManager contract created:', {
      address: packageManagerContract.address,
      hasAddress: !!packageManagerContract.address
    });

    const contracts = {
      packageManager: packageManagerContract,
      vestingVault: createContractInstance<VestingVaultContract>(
        appKitConfig.contracts.vault,
        vestingVaultAbi,
        signerOrProvider
      ),
      taxManager: createContractInstance<SwapTaxManagerContract>(
        appKitConfig.contracts.taxManager,
        swapTaxManagerAbi,
        signerOrProvider
      ),
      shareToken: createContractInstance<ShareTokenContract>(
        appKitConfig.contracts.share,
        shareTokenAbi,
        signerOrProvider
      ),
      lpToken: createContractInstance<LPTokenContract>(
        appKitConfig.contracts.lp,
        lpTokenAbi,
        signerOrProvider
      ),
      router: createContractInstance<PancakeRouterContract>(
        appKitConfig.contracts.router,
        pancakeRouterAbi,
        signerOrProvider
      ),
      factory: createContractInstance<Contract>(
        appKitConfig.contracts.factory,
        pancakeFactoryAbi,
        signerOrProvider
      ),
      usdtToken: createContractInstance<ERC20Contract>(
        appKitConfig.contracts.usdt,
        erc20Abi,
        signerOrProvider
      ),
      // V2 Contracts
      dividendDistributor: appKitConfig.contracts.dividendDistributor ? createContractInstance<Contract>(
        appKitConfig.contracts.dividendDistributor,
        dividendDistributorAbi,
        signerOrProvider
      ) : null,
      secondaryMarket: appKitConfig.contracts.secondaryMarket ? createContractInstance<Contract>(
        appKitConfig.contracts.secondaryMarket,
        secondaryMarketAbi,
        signerOrProvider
      ) : null,
      staking: (() => {
        console.log('🎯 Staking contract creation check:', {
          stakingAddress: appKitConfig.contracts.staking,
          stakingAddressTruthy: !!appKitConfig.contracts.staking,
          stakingAddressType: typeof appKitConfig.contracts.staking,
          stakingAddressLength: appKitConfig.contracts.staking?.length || 0
        });
        return appKitConfig.contracts.staking ? createContractInstance<Contract>(
          appKitConfig.contracts.staking,
          stakingAbi,
          signerOrProvider
        ) : null;
      })(),
    };

    console.log('✅ Contract instances created successfully:', {
      usdtToken: !!contracts.usdtToken,
      shareToken: !!contracts.shareToken,
      lpToken: !!contracts.lpToken,
      vestingVault: !!contracts.vestingVault,
      taxManager: !!contracts.taxManager,
      router: !!contracts.router,
      factory: !!contracts.factory,
      packageManager: !!contracts.packageManager,
      dividendDistributor: !!contracts.dividendDistributor,
      secondaryMarket: !!contracts.secondaryMarket,
      staking: !!contracts.staking,
      stakingAddress: appKitConfig.contracts.staking
    });

    return contracts;
  } catch (error) {
    console.error('❌ Error creating contract instances:', error);
    console.error('Contract addresses being used:', appKitConfig.contracts);
    console.error('Staking contract specifically:', {
      stakingAddress: appKitConfig.contracts.staking,
      stakingEnabled: !!appKitConfig.contracts.staking
    });
    throw error;
  }
}

// Utility function to get contracts with a specific signer (Ethers v6)
export function getContractsWithSigner(signer: Signer) {
  return getContracts(signer);
}

// Utility function to easily switch to failover provider
export async function getContractsWithFailoverSigner(signer: Signer) {
  return getContractsWithFailover(signer);
}

export interface Package {
  entryUSDT: bigint;        // uint256
  exchangeRate: bigint;     // uint256 (18 decimals)
  cliff: number;            // uint64
  duration: number;         // uint64
  vestBps: number;          // uint16
  referralBps: number;      // uint16
  active: boolean;          // bool
  exists: boolean;          // bool
  name: string;             // string
}


export interface PackageSplits {
  totalTokens: bigint;
  vestTokens: bigint;
  poolTokens: bigint;
  lpTokens: bigint;
  usdtPool: bigint;
  usdtVault: bigint;
}

// New interfaces for smart contract view functions
export interface UserStats {
  totalInvested: bigint;
  totalTokensReceived: bigint;
  totalVestTokens: bigint;
  totalPoolTokens: bigint;
  totalLPTokens: bigint;
  totalReferralRewards: bigint;
  purchaseCount: bigint;
  redemptionCount: bigint;
  totalRedemptions: bigint;
}

export interface UserPurchase {
  packageId: bigint;
  usdtAmount: bigint;
  totalTokens: bigint;
  vestTokens: bigint;
  poolTokens: bigint;
  lpTokens: bigint;
  referrer: string;
  referralReward: bigint;
  timestamp: bigint;
}

export interface UserRedemptions {
  amounts: bigint[];
  timestamps: bigint[];
}

// Enhanced liquidity addition event interfaces
export interface LiquidityAddedEvent {
  user: string;
  packageId: bigint;
  shareTokenAmount: bigint;
  usdtAmount: bigint;
  liquidityTokens: bigint;
  actualShareToken: bigint;
  actualUSDT: bigint;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface LiquidityAdditionFailedEvent {
  user: string;
  packageId: bigint;
  usdtAmount: bigint;
  reason: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface SlippageProtectionTriggeredEvent {
  user: string;
  packageId: bigint;
  requestedShareToken: bigint;
  requestedUSDT: bigint;
  minShareToken: bigint;
  minUSDT: bigint;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

// Get consistent decimal precision for package data (V2 architecture)

// Contract interaction helper functions
// Note: Global exchange rate system has been removed in favor of per-package exchange rates

export async function getGlobalTargetPrice(): Promise<bigint> {
  try {
    const contracts = getContracts();
    return await contracts.packageManager.globalTargetPrice();
  } catch (error) {
    console.error('Error fetching global target price:', error);
    return 2000000000000000000n; // Default to 2.0 USDT per BLOCKS (18 decimals)
  }
}

export type PackageWithId = Package & { id: number };

export async function getPackageById(id: number): Promise<PackageWithId | null> {
  try {
    const contracts = getContracts();
    const p = await contracts.packageManager.getPackage(id);

    const pkg: Package = {
      entryUSDT: p.entryUSDT,
      exchangeRate: p.exchangeRate,
      cliff: Number(p.cliff),
      duration: Number(p.duration),
      vestBps: Number(p.vestBps),
      referralBps: Number(p.referralBps),
      active: p.active,
      exists: p.exists,
      name: p.name,
    };

    // attach id separately
    return { ...pkg, id };
  } catch (error) {
    console.error('Error fetching package:', error);
    return null;
  }
}


export async function getAllPackages(): Promise<PackageWithId[]> {
  try {
    const contracts = getContracts();

    const packageCount = await contracts.packageManager.nextPackageId();
    const packageIds = Array.from({ length: Number(packageCount) }, (_, i) => i);

    const packages: PackageWithId[] = [];

    for (const id of packageIds) {
      const pkg = await getPackageById(Number(id));
      if (pkg && pkg.exists) {
        packages.push(pkg);
      }
    }

    return packages;
  } catch (error) {
    console.error('Error fetching packages:', error);
    return [];
  }
}

// Token balance helper functions (Ethers v6 - using bigint)
export async function getTokenBalance(
  tokenAddress: string,
  userAddress: string
): Promise<bigint> {
  try {
    const provider = getProvider();
    const tokenContract = new Contract(tokenAddress, erc20Abi.abi || erc20Abi, provider);
    return await tokenContract.balanceOf(userAddress);
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0n;
  }
}

export async function getUSDTBalance(userAddress: string): Promise<bigint> {
  return getTokenBalance(appKitConfig.contracts.usdt, userAddress);
}

// Note: Function names kept for compatibility, but now returns BLOCKS token balance
export async function getShareTokenBalance(userAddress: string): Promise<bigint> {
  return getTokenBalance(appKitConfig.contracts.share, userAddress);
}

// Note: Function names kept for compatibility, but now returns BLOCKS-LP token balance
export async function getLPTokenBalance(userAddress: string): Promise<bigint> {
  return getTokenBalance(appKitConfig.contracts.lp, userAddress);
}

// Enhanced vesting info interface
export interface VestingSchedule {
  cliff: bigint;
  duration: bigint;
  start: bigint;
}

export interface EnhancedVestingInfo {
  totalVested: bigint;
  claimable: bigint;
  claimed: bigint;
  remaining: bigint;
  schedule: VestingSchedule;
  cliffEndTime: bigint;
  vestingEndTime: bigint;
  isCliffPassed: boolean;
  isFullyVested: boolean;
  vestingProgress: number; // Percentage (0-100)
}

// Vesting-related functions (Ethers v6 - using bigint)
export async function getVestingInfo(userAddress: string): Promise<EnhancedVestingInfo> {
  try {
    const contracts = getContracts();
    const [totalLocked, released, vestedAmount, schedule] = await Promise.all([
      contracts.vestingVault.totalLocked(userAddress),
      contracts.vestingVault.released(userAddress),
      contracts.vestingVault.vestedAmount(userAddress),
      contracts.vestingVault.userSchedule(userAddress)
    ]);

    // Calculate claimable amount (vested - released) as bigint
    const claimable = (vestedAmount as bigint) - (released as bigint);
    const remaining = (totalLocked as bigint) - (released as bigint);
    const cliffEndTime = schedule.start + schedule.cliff;
    const vestingEndTime = schedule.start + schedule.duration;
    const currentTime = BigInt(Math.floor(Date.now() / 1000));

    const isCliffPassed = currentTime >= cliffEndTime;
    const isFullyVested = currentTime >= vestingEndTime;

    // Calculate vesting progress percentage
    let vestingProgress: number = 0;
    if (schedule.duration > 0n) {
      if (currentTime <= schedule.start) {
        vestingProgress = 0;
      } else if (currentTime >= vestingEndTime) {
        vestingProgress = 100;
      } else {
        const elapsed = currentTime - schedule.start;
        vestingProgress = Number((elapsed * 100n) / schedule.duration);
      }
    }

    return {
      totalVested: totalLocked,
      claimable,
      claimed: released,
      remaining,
      schedule: {
        cliff: schedule.cliff,
        duration: schedule.duration,
        start: schedule.start
      },
      cliffEndTime,
      vestingEndTime,
      isCliffPassed,
      isFullyVested,
      vestingProgress
    };
  } catch (error) {
    console.error('Error fetching vesting info:', error);
    return {
      totalVested: 0n,
      claimable: 0n,
      claimed: 0n,
      remaining: 0n,
      schedule: {
        cliff: 0n,
        duration: 0n,
        start: 0n
      },
      cliffEndTime: 0n,
      vestingEndTime: 0n,
      isCliffPassed: false,
      isFullyVested: false,
      vestingProgress: 0
    };
  }
}

// Transaction helper functions (Ethers v6)
export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint,
  signer: Signer
): Promise<any> {
  const tokenContract = new Contract(tokenAddress, erc20Abi.abi || erc20Abi, signer);
  return await tokenContract.approve(spenderAddress, amount);
}

export async function purchasePackage(
  packageId: number,
  referrer: string,
  signer: Signer
): Promise<any> {
  const contracts = getContracts(signer);
  return await contracts.packageManager.purchase(packageId, referrer);
}

export async function redeemLPTokens(
  amount: bigint,
  signer: Signer
): Promise<any> {
  const contracts = getContracts(signer);
  return await contracts.packageManager.redeem(amount);
}

// Enhanced LP token redemption with actual liquidity removal
export async function redeemLPTokensWithLiquidityRemoval(
  amount: bigint,
  signer: Signer,
  slippageConfig?: SlippageConfig,
  mevProtection?: MEVProtection
): Promise<ethers.ContractTransactionResponse> {
  const liquidityManager = createLiquidityManager(signer);
  return await liquidityManager.removeLiquidity(amount, slippageConfig, mevProtection);
}

// Enhanced LP token redemption using smart contract function
export async function redeemLPTokensWithContractLiquidityRemoval(
  amount: bigint,
  amountShareMin: bigint,
  amountUSDTMin: bigint,
  deadline: number,
  signer: Signer
): Promise<ethers.ContractTransactionResponse> {
  const contracts = getContracts(signer);
  return await contracts.packageManager.redeemWithLiquidityRemoval(
    amount,
    amountShareMin,
    amountUSDTMin,
    deadline
  );
}

// Referral rewards claim helper (stub). Current system pays instantly via ReferralPaid events
// and updates on-chain stats; no explicit claim txn is required. We keep this for future-proofing.
export async function claimReferralRewards(userAddress: string): Promise<{ pending: boolean; wait?: () => Promise<void> } | null> {
  try {
    // If in future there is a claim function, wire it here using signer
    // For now, return null to indicate no-op and let UI inform user
    return null;
  } catch (error) {
    console.error('Error claiming referral rewards:', error);
    throw error;
  }
}

// Get redemption preview from smart contract
export async function getContractRedemptionPreview(
  amount: bigint,
  signer: Signer
): Promise<{ expectedShare: bigint; expectedUSDT: bigint; liquidityToRemove: bigint }> {
  const contracts = getContracts(signer);
  const [expectedShare, expectedUSDT, liquidityToRemove] = await contracts.packageManager.getRedemptionPreview(amount);
  return { expectedShare, expectedUSDT, liquidityToRemove };
}

// Get liquidity removal preview
export async function getLiquidityRemovalPreview(
  amount: bigint,
  signer: Signer,
  slippageConfig?: SlippageConfig
): Promise<LiquidityRemovalPreview> {
  const liquidityManager = createLiquidityManager(signer);
  return await liquidityManager.calculateLiquidityRemoval(amount, slippageConfig);
}

// Get current token prices from the liquidity pool
export async function getTokenPricesFromPool(signer: Signer): Promise<{ shareTokenPriceInUSDT: number; usdtPriceInShareToken: number }> {
  const liquidityManager = createLiquidityManager(signer);
  return await liquidityManager.getTokenPrices();
}

export async function claimVestedTokens(
  signer: Signer
): Promise<any> {
  const contracts = getContracts(signer);
  return await contracts.vestingVault.claim();
}

// Error handling wrapper for contract calls
export async function safeContractCall<T>(
  contractCall: () => Promise<T>,
  errorMessage: string = 'Contract call failed'
): Promise<T | null> {
  try {
    return await contractCall();
  } catch (error) {
    console.error(errorMessage, error);
    return null;
  }
}

// New efficient portfolio data functions using smart contract view functions
export async function getUserPortfolioStats(userAddress: string): Promise<UserStats | null> {
  try {
    const contracts = getContracts();
    const stats = await contracts.packageManager.getUserStats(userAddress);

    return {
      totalInvested: stats.totalInvested,
      totalTokensReceived: stats.totalTokensReceived,
      totalVestTokens: stats.totalVestTokens,
      totalPoolTokens: stats.totalPoolTokens,
      totalLPTokens: stats.totalLPTokens,
      totalReferralRewards: stats.totalReferralRewards,
      purchaseCount: stats.purchaseCount,
      redemptionCount: stats.redemptionCount,
      totalRedemptions: stats.totalRedemptions,
    };
  } catch (error) {
    console.error('Error fetching user portfolio stats:', error);
    return null;
  }
}

export async function getUserPurchaseHistory(userAddress: string): Promise<PurchaseRecord[]> {
  try {
    const contracts = getContracts();
    const purchases = await contracts.packageManager.getUserPurchases(userAddress);

    // Convert to PurchaseRecord format with package names
    const purchaseRecords: PurchaseRecord[] = [];

    for (const purchase of purchases) {
      try {
        // Get package details for name
        const packageData = await getPackageById(Number(purchase.packageId));
        const ts = Number(purchase.timestamp);
        const cachedTxHash = getCachedPurchaseTx(userAddress, ts);

        purchaseRecords.push({
          packageId: Number(purchase.packageId),
          packageName: packageData?.name || `Package ${purchase.packageId}`,
          usdtAmount: purchase.usdtAmount,
          totalTokens: purchase.totalTokens,
          vestTokens: purchase.vestTokens,
          poolTokens: purchase.poolTokens,
          lpTokens: purchase.lpTokens,
          referrer: purchase.referrer,
          referralReward: purchase.referralReward,
          timestamp: ts,
          blockNumber: 0, // Not available from view function
          transactionHash: cachedTxHash || '', // Hydrated from event cache if available
        });
      } catch (err) {
        console.warn('Error processing purchase record:', err);
      }
    }

    return purchaseRecords;
  } catch (error) {
    console.error('Error fetching user purchase history:', error);
    return [];
  }
}

export async function getUserRedemptionHistory(userAddress: string): Promise<Array<{
  lpAmount: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}>> {
  try {
    const contracts = getContracts();
    const [amounts, timestamps] = await contracts.packageManager.getUserRedemptions(userAddress);

    // Convert to expected format
    const redemptions: Array<{ lpAmount: bigint; timestamp: number; blockNumber: number; transactionHash: string }> = [];
    for (let i = 0; i < amounts.length; i++) {
      const ts = Number(timestamps[i]);
      const cachedTxHash = getCachedRedemptionTx(userAddress, ts);
      redemptions.push({
        lpAmount: amounts[i],
        timestamp: ts,
        blockNumber: 0, // Not available from view function
        transactionHash: cachedTxHash || '', // Hydrated from event cache if available
      });
    }

    return redemptions;
  } catch (error) {
    console.error('Error fetching user redemption history:', error);
    return [];
  }
}

// Referral-related functions
// Backend API-based referral data functions (most reliable)
export async function getUserReferralDataFromAPI(userAddress: string): Promise<{
  referrals: Array<{
    id: string;
    packageId: number;
    buyerAddress: string;
    referrerAddress: string;
    usdtAmount: number;
    mpesaStatus: string;
    blockchainStatus: string;
    txHash: string | null;
    mpesaReceiptNumber: string | null;
    transactionDate: string | null;
    createdAt: string;
  }>;
  stats: {
    totalReferrals: number;
    completedReferrals: number;
    totalReferralVolume: number;
    lastReferralDate: string | null;
  };
} | null> {
  try {
    console.log(`Fetching referral data from API for ${userAddress}...`);

    // Use the same API base URL as the M-Pesa service
    const API_BASE_URL = import.meta.env.VITE_MPESA_API_URL || 'https://api.blockcoopsacco.com/api';
    const response = await fetch(`${API_BASE_URL}/mpesa/referrals/${userAddress}`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      console.log(`API referral data: ${data.referrals.length} referrals, ${data.stats.completedReferrals} completed`);
      return data;
    } else {
      throw new Error(data.error || 'API request failed');
    }
  } catch (error) {
    console.error('Error fetching referral data from API:', error);
    return null;
  }
}

// Direct contract-based referral data functions (fallback)
export async function getUserReferralStatsFromContract(userAddress: string): Promise<{
  totalReferralRewards: bigint;
  referralCount: number;
} | null> {
  try {
    console.log(`Fetching referral stats from contract for ${userAddress}...`);
    const contracts = getContracts();

    // Get user stats directly from contract
    const userStats = await contracts.packageManager.getUserStats(userAddress);

    // Get user purchases to count referrals made by this user
    const userPurchases = await contracts.packageManager.getUserPurchases(userAddress);

    // Count how many purchases this user made with referrals (where they earned rewards)
    const referralCount = userPurchases.filter((purchase: any) =>
      purchase.referralReward && purchase.referralReward > 0n
    ).length;

    console.log(`Contract stats: totalReferralRewards=${userStats.totalReferralRewards.toString()}, referralCount=${referralCount}`);

    return {
      totalReferralRewards: userStats.totalReferralRewards,
      referralCount: referralCount
    };
  } catch (error) {
    console.error('Error fetching referral stats from contract:', error);
    return null;
  }
}

export async function getUserReferralHistoryFromContract(userAddress: string): Promise<Array<{
  referrer: string;
  buyer: string;
  reward: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}>> {
  try {
    console.log(`Fetching referral history from contract for ${userAddress}...`);
    const contracts = getContracts();

    // Get user purchases to find referral transactions
    const userPurchases = await contracts.packageManager.getUserPurchases(userAddress);

    // Filter purchases where this user earned referral rewards
    const referralTransactions = (userPurchases as Array<any>)
      .filter((purchase: any) => purchase.referralReward && purchase.referralReward > 0n)
      .map((purchase: any) => ({
        referrer: userAddress, // This user is the referrer
        buyer: userAddress, // We don't have buyer info from this view, using placeholder
        reward: purchase.referralReward,
        timestamp: Number(purchase.timestamp),
        blockNumber: 0, // Not available from contract view
        transactionHash: '', // Not available from contract view
      }));

    console.log(`Found ${referralTransactions.length} referral transactions from contract`);

    // Sort by timestamp (newest first)
    referralTransactions.sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp);

    return referralTransactions;
  } catch (error) {
    console.error('Error fetching referral history from contract:', error);
    return [];
  }
}

// Main referral history function with multiple fallbacks
export async function getUserReferralHistory(userAddress: string): Promise<Array<{
  referrer: string;
  buyer: string;
  reward: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}>> {
  try {
    // First try the backend API approach (most reliable)
    console.log('Attempting backend API referral data fetch...');
    const apiData = await getUserReferralDataFromAPI(userAddress);

    if (apiData && apiData.referrals.length > 0) {
      console.log('Successfully retrieved referral data from backend API');

      // Convert API data to expected format
      const referralHistory = apiData.referrals.map(ref => ({
        referrer: ref.referrerAddress,
        buyer: ref.buyerAddress,
        reward: BigInt(Math.floor(ref.usdtAmount * 1000000)), // Convert USD to wei-like units
        timestamp: Math.floor(new Date(ref.createdAt).getTime() / 1000),
        blockNumber: 0, // Not available from API
        transactionHash: ref.txHash || '',
      }));

      // Cache the API data
      const cacheKey = userAddress.toLowerCase();
      const cacheEntry = {
        data: referralHistory,
        timestamp: Date.now(),
        userAddress: userAddress.toLowerCase()
      };

      referralHistoryCache.set(cacheKey, cacheEntry);

      try {
        const localStorageData = loadFromLocalStorage(REFERRAL_HISTORY_CACHE_KEY) || {};
        localStorageData[cacheKey] = cacheEntry;
        saveToLocalStorage(REFERRAL_HISTORY_CACHE_KEY, localStorageData);
      } catch (error) {
        console.warn('Failed to save API referral data to localStorage:', error);
      }

      return referralHistory;
    }

    // If no API data, try the direct contract approach
    console.log('No API data found, attempting direct contract-based referral data fetch...');
    const contractHistory = await getUserReferralHistoryFromContract(userAddress);

    if (contractHistory.length > 0) {
      console.log('Successfully retrieved referral data from contract');
      return contractHistory;
    }

    // If no contract data, fall back to cached data only
    console.log('No contract referral data found, checking cache...');

    // Check in-memory cache first
    const cacheKey = userAddress.toLowerCase();
    const cachedEntry = referralHistoryCache.get(cacheKey);

    if (cachedEntry && isCacheValid(cachedEntry)) {
      console.log('Returning in-memory cached referral history for', userAddress);
      return cachedEntry.data;
    }

    // Check localStorage cache
    const localStorageData = loadFromLocalStorage(REFERRAL_HISTORY_CACHE_KEY);
    if (localStorageData && localStorageData[cacheKey]) {
      const localEntry = localStorageData[cacheKey];
      if (isCacheValid(localEntry)) {
        console.log('Returning localStorage cached referral history for', userAddress);
        // Also update in-memory cache
        referralHistoryCache.set(cacheKey, localEntry);
        return localEntry.data;
      }
    }

    // No data available from any source
    console.log('No referral data available from any source');
    return [];
  } catch (error) {
    console.error('Error fetching user referral history:', error);

    // If we hit an error, try to return any cached data we have (even if expired)
    const cacheKey = userAddress.toLowerCase();
    const cachedEntry2 = referralHistoryCache.get(cacheKey);
    if (cachedEntry2) {
      console.log('Returning expired cached referral data due to error');
      return cachedEntry2.data;
    }

    // Check localStorage for any cached data
    try {
      const localStorageData = loadFromLocalStorage(REFERRAL_HISTORY_CACHE_KEY);
      if (localStorageData && localStorageData[cacheKey]) {
        console.log('Returning expired localStorage referral data due to error');
        return localStorageData[cacheKey].data;
      }
    } catch (localError) {
      console.warn('Failed to load fallback referral data from localStorage:', localError);
    }

    return [];
  }
}

export async function getReferralStats(userAddress: string): Promise<{
  totalRewards: bigint;
  referralCount: number;
  averageReward: bigint;
  lastReferralDate: number | null;
  topReferralReward: bigint;
}> {
  try {
    // Check in-memory cache first
    const cacheKey = userAddress.toLowerCase();
    const cachedEntry = referralStatsCache.get(cacheKey);

    if (cachedEntry && isCacheValid(cachedEntry)) {
      console.log('Returning in-memory cached referral stats for', userAddress);
      return cachedEntry.data;
    }

    // Check localStorage cache
    const localStorageData = loadFromLocalStorage(REFERRAL_STATS_CACHE_KEY);
    if (localStorageData && localStorageData[cacheKey]) {
      const localEntry = localStorageData[cacheKey];
      if (isCacheValid(localEntry)) {
        console.log('Returning localStorage cached referral stats for', userAddress);
        // Also update in-memory cache
        referralStatsCache.set(cacheKey, localEntry);
        return localEntry.data;
      }
    }

    console.log(`Calculating referral stats for ${userAddress}...`);

    // First try backend API approach
    const apiData = await getUserReferralDataFromAPI(userAddress);

    if (apiData) {
      console.log('Using backend API stats for referral data');

      // Calculate stats from API data
      const totalRewards = BigInt(Math.floor(apiData.stats.totalReferralVolume * 1000000)); // Convert USD to wei-like units
      const referralCount = apiData.stats.completedReferrals;

      const stats = {
        totalRewards: totalRewards,
        referralCount: referralCount,
        averageReward: referralCount > 0 ? totalRewards / BigInt(referralCount) : 0n,
        lastReferralDate: apiData.stats.lastReferralDate ?
          Math.floor(new Date(apiData.stats.lastReferralDate).getTime() / 1000) : null,
        topReferralReward: totalRewards, // Approximation - would need individual transaction analysis
      };

      // Cache the calculated stats
      const cacheEntry = {
        data: stats,
        timestamp: Date.now(),
        userAddress: userAddress.toLowerCase()
      };

      referralStatsCache.set(cacheKey, cacheEntry);

      // Also save to localStorage
      try {
        const localStorageData = loadFromLocalStorage(REFERRAL_STATS_CACHE_KEY) || {};
        localStorageData[cacheKey] = cacheEntry;
        saveToLocalStorage(REFERRAL_STATS_CACHE_KEY, localStorageData);
      } catch (error) {
        console.warn('Failed to save referral stats to localStorage:', error);
      }

      return stats;
    }

    // Fallback to direct contract approach
    const contractStats = await getUserReferralStatsFromContract(userAddress);

    if (contractStats) {
      console.log('Using direct contract stats for referral data');

      const stats = {
        totalRewards: contractStats.totalReferralRewards,
        referralCount: contractStats.referralCount,
        averageReward: contractStats.referralCount > 0 ?
          contractStats.totalReferralRewards / BigInt(contractStats.referralCount) : 0n,
        lastReferralDate: null, // Not available from contract
        topReferralReward: contractStats.totalReferralRewards, // Approximation
      };

      // Cache the calculated stats
      const cacheEntry = {
        data: stats,
        timestamp: Date.now(),
        userAddress: userAddress.toLowerCase()
      };

      referralStatsCache.set(cacheKey, cacheEntry);

      // Also save to localStorage
      try {
        const localStorageData = loadFromLocalStorage(REFERRAL_STATS_CACHE_KEY) || {};
        localStorageData[cacheKey] = cacheEntry;
        saveToLocalStorage(REFERRAL_STATS_CACHE_KEY, localStorageData);
      } catch (error) {
        console.warn('Failed to save referral stats to localStorage:', error);
      }

      return stats;
    }

    // Fallback to history-based calculation (using cached data only)
    console.log('Contract stats not available, using cached history data...');
    const referralHistory = await getUserReferralHistory(userAddress);

    const stats: {
      totalRewards: bigint;
      referralCount: number;
      averageReward: bigint;
      lastReferralDate: number | null;
      topReferralReward: bigint;
    } = {
      totalRewards: 0n,
      referralCount: 0,
      averageReward: 0n,
      lastReferralDate: null,
      topReferralReward: 0n,
    };

    if (referralHistory.length === 0) {
      // Cache empty stats too
      const cacheEntry = {
        data: stats,
        timestamp: Date.now(),
        userAddress: userAddress.toLowerCase()
      };

      referralStatsCache.set(cacheKey, cacheEntry);

      try {
        const localStorageData = loadFromLocalStorage(REFERRAL_STATS_CACHE_KEY) || {};
        localStorageData[cacheKey] = cacheEntry;
        saveToLocalStorage(REFERRAL_STATS_CACHE_KEY, localStorageData);
      } catch (error) {
        console.warn('Failed to save empty referral stats to localStorage:', error);
      }

      return stats;
    }

    // Calculate statistics from history
    stats.totalRewards = referralHistory.reduce((sum, ref) => sum + ref.reward, 0n);
    stats.referralCount = referralHistory.length;
    stats.averageReward = stats.totalRewards / BigInt(stats.referralCount);
    stats.lastReferralDate = referralHistory[0] ? referralHistory[0].timestamp : null; // Already sorted newest first
    stats.topReferralReward = referralHistory.reduce((max, ref) => ref.reward > max ? ref.reward : max, 0n);

    // Cache the calculated stats
    const cacheEntry = {
      data: stats,
      timestamp: Date.now(),
      userAddress: userAddress.toLowerCase()
    };

    referralStatsCache.set(cacheKey, cacheEntry);

    // Also save to localStorage
    try {
      const localStorageData = loadFromLocalStorage(REFERRAL_STATS_CACHE_KEY) || {};
      localStorageData[cacheKey] = cacheEntry;
      saveToLocalStorage(REFERRAL_STATS_CACHE_KEY, localStorageData);
    } catch (error) {
      console.warn('Failed to save referral stats to localStorage:', error);
    }

    return stats;
  } catch (error) {
    console.error('Error calculating referral stats:', error);

    // If we hit an error, try to return any cached data we have (even if expired)
    const cacheKey = userAddress.toLowerCase();
    const cachedEntry = referralStatsCache.get(cacheKey);
    if (cachedEntry) {
      console.log('Returning expired cached referral stats due to error');
      return cachedEntry.data;
    }

    // Check localStorage for any cached data
    try {
      const localStorageData = loadFromLocalStorage(REFERRAL_STATS_CACHE_KEY);
      if (localStorageData && localStorageData[cacheKey]) {
        console.log('Returning expired localStorage referral stats due to error');
        return localStorageData[cacheKey].data;
      }
    } catch (localError) {
      console.warn('Failed to load fallback referral stats from localStorage:', localError);
    }

    return {
      totalRewards: 0n,
      referralCount: 0,
      averageReward: 0n,
      lastReferralDate: null,
      topReferralReward: 0n,
    };
  }
}

// Purchase history types
export interface PurchaseRecord {
  packageId: number;
  packageName: string;
  usdtAmount: bigint;
  totalTokens: bigint;
  vestTokens: bigint;
  poolTokens: bigint;
  lpTokens: bigint;
  referrer: string;
  referralReward: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

// Constants for event fetching optimization - More conservative settings to avoid rate limits
const BLOCK_RANGE_LIMIT = 200; // Even smaller chunks to reduce RPC load further
const MAX_RETRIES = 3; // Keep retries limited
const RETRY_DELAY_MS = 10000; // Longer base delay to respect rate limits
const REQUEST_THROTTLE_MS = 2500; // Slightly longer delay between page requests
const INTER_QUERY_DELAY_MS = 7000; // Longer delay between different query types
const CACHE_DURATION_MS = 30 * 60 * 1000; // Longer cache duration to reduce queries

// Enhanced cache with localStorage persistence
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userAddress: string;
  blockRange?: { fromBlock: number; toBlock: number };
}

const purchaseHistoryCache = new Map<string, CacheEntry<PurchaseRecord[]>>();
const redemptionHistoryCache = new Map<string, CacheEntry<Array<{
  lpAmount: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}>>>();

// Add referral caching
const referralHistoryCache = new Map<string, CacheEntry<Array<{
  referrer: string;
  buyer: string;
  reward: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}>>>();

const referralStatsCache = new Map<string, CacheEntry<{
  totalRewards: bigint;
  referralCount: number;
  averageReward: bigint;
  lastReferralDate: number | null;
  topReferralReward: bigint;
}>>();

// localStorage cache keys
const PURCHASE_CACHE_KEY = 'blockcoop_purchase_history';
const REDEMPTION_CACHE_KEY = 'blockcoop_redemption_history';
const REFERRAL_HISTORY_CACHE_KEY = 'blockcoop_referral_history';
const REFERRAL_STATS_CACHE_KEY = 'blockcoop_referral_stats';

// Utility function to check if cache entry is valid
function isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_DURATION_MS;
}

// localStorage helper functions
function saveToLocalStorage(key: string, data: any): void {
  try {
    // Convert BigInt values to strings for JSON serialization
    const serializedData = JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
    localStorage.setItem(key, serializedData);
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

function loadFromLocalStorage(key: string): any {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;

    // Parse and convert string values back to BigInt where needed
    return JSON.parse(data, (_, value) => {
      // Check if value looks like a BigInt string (all digits)
      if (typeof value === 'string' && /^\d+$/.test(value) && value.length > 15) {
        try {
          return BigInt(value);
        } catch {
          return value;
        }
      }
      return value;
    });
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return null;
  }
}

// Function to clear cache for a specific user (call after new purchases/redemptions)
export function clearUserHistoryCache(userAddress: string): void {
  const cacheKey = userAddress.toLowerCase();
  purchaseHistoryCache.delete(cacheKey);
  redemptionHistoryCache.delete(cacheKey);
  referralHistoryCache.delete(cacheKey);
  referralStatsCache.delete(cacheKey);

  // Also clear localStorage cache
  try {
    const purchaseData = loadFromLocalStorage(PURCHASE_CACHE_KEY) || {};
    const redemptionData = loadFromLocalStorage(REDEMPTION_CACHE_KEY) || {};
    const referralHistoryData = loadFromLocalStorage(REFERRAL_HISTORY_CACHE_KEY) || {};
    const referralStatsData = loadFromLocalStorage(REFERRAL_STATS_CACHE_KEY) || {};
    delete purchaseData[cacheKey];
    delete redemptionData[cacheKey];
    delete referralHistoryData[cacheKey];
    delete referralStatsData[cacheKey];
    saveToLocalStorage(PURCHASE_CACHE_KEY, purchaseData);
    saveToLocalStorage(REDEMPTION_CACHE_KEY, redemptionData);
    saveToLocalStorage(REFERRAL_HISTORY_CACHE_KEY, referralHistoryData);
    saveToLocalStorage(REFERRAL_STATS_CACHE_KEY, referralStatsData);
  } catch (error) {
    console.warn('Failed to clear localStorage cache for user:', error);
  }

  console.log('Cleared history cache for', userAddress);
}

// Function to clear all localStorage cache (useful for debugging or when switching networks)
export function clearAllHistoryCache(): void {
  try {
    localStorage.removeItem(PURCHASE_CACHE_KEY);
    localStorage.removeItem(REDEMPTION_CACHE_KEY);
    localStorage.removeItem(REFERRAL_HISTORY_CACHE_KEY);
    localStorage.removeItem(REFERRAL_STATS_CACHE_KEY);
    purchaseHistoryCache.clear();
    redemptionHistoryCache.clear();
    referralHistoryCache.clear();
    referralStatsCache.clear();
    console.log('Cleared all history cache');
  } catch (error) {
    console.warn('Failed to clear all cache:', error);
  }
}

// Debug function to check cache status
export function getCacheStatus(): {
  inMemory: { purchases: number; redemptions: number };
  localStorage: { purchases: number; redemptions: number };
} {
  const purchaseLocalData = loadFromLocalStorage(PURCHASE_CACHE_KEY) || {};
  const redemptionLocalData = loadFromLocalStorage(REDEMPTION_CACHE_KEY) || {};

  return {
    inMemory: {
      purchases: purchaseHistoryCache.size,
      redemptions: redemptionHistoryCache.size
    },
    localStorage: {
      purchases: Object.keys(purchaseLocalData).length,
      redemptions: Object.keys(redemptionLocalData).length
    }
  };
}

// Utility function to sleep for retry logic
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility function to get recent block range for event queries
async function getRecentBlockRange(): Promise<{ fromBlock: number; toBlock: number }> {
  try {
    const provider = getProvider();
    const latestBlock = await provider.getBlockNumber();

    // Start with a much smaller range to avoid rate limits
    // Query last 24 hours worth of blocks (assuming ~3 second block time on BSC)
    // 24 hours * 60 minutes * 60 seconds / 3 seconds per block = ~28,800 blocks
    const blocksToQuery = Math.min(28800, latestBlock); // Much smaller initial range
    const fromBlock = Math.max(0, latestBlock - blocksToQuery);

    console.log(`Block range: ${fromBlock} to ${latestBlock} (${latestBlock - fromBlock} blocks)`);
    return { fromBlock, toBlock: latestBlock };
  } catch (error) {
    console.warn('Error getting block range, using default:', error);
    // Fallback to an even smaller range if we can't get the latest block
    const fallbackProvider = getProvider();
    const latestBlockFallback = await fallbackProvider.getBlockNumber().catch(() => 0);
    const fromBlock = Math.max(0, latestBlockFallback - 10000); // Only last ~8 hours as fallback
    return { fromBlock, toBlock: (latestBlockFallback as number) };
  }
}

// Enhanced function to query events with pagination and retry logic
async function queryEventsWithPagination(
  contract: any,
  filter: any,
  fromBlock: number,
  toBlock: number | string
): Promise<any[]> {
  const allEvents: any[] = [];
  let currentFromBlock = fromBlock;
  const finalToBlock = typeof toBlock === 'string' ? await contract.provider.getBlockNumber() : toBlock;

  while (currentFromBlock <= finalToBlock) {
    const currentToBlock = Math.min(currentFromBlock + BLOCK_RANGE_LIMIT - 1, finalToBlock);

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        console.log(`Querying events from block ${currentFromBlock} to ${currentToBlock}`);

        const events = await contract.queryFilter(filter, currentFromBlock, currentToBlock);
        allEvents.push(...events);

        // Add throttling delay between successful requests to avoid rate limits
        if (currentFromBlock + BLOCK_RANGE_LIMIT <= finalToBlock) {
          console.log(`Throttling for ${REQUEST_THROTTLE_MS}ms before next request...`);
          await sleep(REQUEST_THROTTLE_MS);
        }

        break; // Success, exit retry loop

      } catch (error: any) {
        retries++;
        console.warn(`Error querying events (attempt ${retries}/${MAX_RETRIES}):`, error);

        if (error?.code === -32005 || error?.message?.includes('limit exceeded') || error?.message?.includes('rate limit')) {
          // Rate limit error - wait and retry with exponential backoff
          const delay = RETRY_DELAY_MS * Math.pow(2, retries - 1);
          console.log(`Rate limit hit, waiting ${delay}ms before retry (attempt ${retries}/${MAX_RETRIES})...`);
          await sleep(delay);

          if (retries === MAX_RETRIES) {
            console.error(`Max retries reached for block range ${currentFromBlock}-${currentToBlock}, skipping this range`);
            // Skip this range and continue with next
            break;
          }
        } else {
          // Non-rate-limit error, skip this range
          console.error(`Non-recoverable error for block range ${currentFromBlock}-${currentToBlock}:`, error);
          break;
        }
      }
    }

    currentFromBlock = currentToBlock + 1;
  }

  return allEvents;
}

// Legacy function to get user's purchase history from blockchain events (deprecated)
export async function getUserPurchaseHistoryFromEvents(userAddress: string): Promise<PurchaseRecord[]> {
  try {
    // Check in-memory cache first
    const cacheKey = userAddress.toLowerCase();
    const cachedEntry = purchaseHistoryCache.get(cacheKey);

    if (cachedEntry && isCacheValid(cachedEntry)) {
      console.log('Returning in-memory cached purchase history for', userAddress);
      return cachedEntry.data;
    }

    // Check localStorage cache
    const localStorageData = loadFromLocalStorage(PURCHASE_CACHE_KEY);
    if (localStorageData && localStorageData[cacheKey]) {
      const localEntry = localStorageData[cacheKey];
      if (isCacheValid(localEntry)) {
        console.log('Returning localStorage cached purchase history for', userAddress);
        // Also update in-memory cache
        purchaseHistoryCache.set(cacheKey, localEntry);
        return localEntry.data;
      }
    }

    console.log(`Starting purchase history fetch for ${userAddress}...`);
    const contracts = getContracts();
    const provider = getProvider();

    // Get recent block range to avoid querying from genesis
    const { fromBlock, toBlock } = await getRecentBlockRange();

    console.log(`Fetching purchase history for ${userAddress} from block ${fromBlock} to ${toBlock} (${toBlock - fromBlock} blocks)`);

    // Add throttling delay before starting queries
    await sleep(500);

    // Get all Purchased events for this user with pagination
    const filter = contracts.packageManager.filters.Purchased(userAddress);
    const events = await queryEventsWithPagination(contracts.packageManager, filter, fromBlock, toBlock);

    console.log(`Found ${events.length} purchase events for ${userAddress}`);

    const purchases: PurchaseRecord[] = [];

    // Process events in smaller batches to avoid overwhelming the RPC
    const batchSize = 5; // Reduced from 10 to 5 for better RPC handling
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)} (${batch.length} events)`);

      const batchPromises = batch.map(async (event) => {
        try {
          // Get block timestamp with retry logic
          let block;
          let retries = 0;
          while (retries < 3) {
            try {
              block = await provider.getBlock(event.blockNumber);
              break;
            } catch (err) {
              retries++;
              if (retries < 3) {
                await sleep(1000 * retries); // Progressive delay
              } else {
                console.warn(`Failed to get block ${event.blockNumber} after 3 retries`);
              }
            }
          }
          const timestamp = block ? block.timestamp : 0;

          // Get package details
          const packageData = await getPackageById(Number(event.args.packageId));

          return {
            packageId: Number(event.args.packageId),
            packageName: packageData?.name || `Package ${event.args.packageId}`,
            usdtAmount: event.args.usdtAmount,
            totalTokens: event.args.totalTokens,
            vestTokens: event.args.vestTokens,
            poolTokens: event.args.poolTokens,
            lpTokens: event.args.lpTokens,
            referrer: event.args.referrer,
            referralReward: event.args.referralReward,
            timestamp,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
          };
        } catch (err) {
          console.warn('Error processing purchase event:', err);
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result: PromiseSettledResult<any>) => {
        if (result.status === 'fulfilled' && result.value) {
          purchases.push(result.value);
        }
      });

      // Longer delay between batches to be nice to the RPC
      if (i + batchSize < events.length) {
        await sleep(500); // Increased from 100ms to 500ms
      }
    }

    console.log(`Processed ${purchases.length} purchase records`);

    // Sort by timestamp (newest first)
    const sortedPurchases = purchases.sort((a, b) => b.timestamp - a.timestamp);

    // Cache the result in memory
    const cacheEntry = {
      data: sortedPurchases,
      timestamp: Date.now(),
      userAddress: userAddress.toLowerCase(),
      blockRange: { fromBlock, toBlock }
    };

    purchaseHistoryCache.set(cacheKey, cacheEntry);

    // Also save to localStorage
    try {
      const localStorageData = loadFromLocalStorage(PURCHASE_CACHE_KEY) || {};
      localStorageData[cacheKey] = cacheEntry;
      saveToLocalStorage(PURCHASE_CACHE_KEY, localStorageData);
    } catch (error) {
      console.warn('Failed to save purchase history to localStorage:', error);
    }

    return sortedPurchases;
  } catch (error) {
    console.error('Error fetching purchase history:', error);

    // If we hit an error, try to return any cached data we have (even if expired)
    const cacheKey = userAddress.toLowerCase();
    const cachedEntry2 = purchaseHistoryCache.get(cacheKey);
    if (cachedEntry2) {
      console.log('Returning expired cached data due to error');
      return cachedEntry2.data;
    }

    // Check localStorage for any cached data
    try {
      const localStorageData = loadFromLocalStorage(PURCHASE_CACHE_KEY);
      if (localStorageData && localStorageData[cacheKey]) {
        console.log('Returning expired localStorage data due to error');
        return localStorageData[cacheKey].data;
      }
    } catch (localError) {
      console.warn('Failed to load fallback data from localStorage:', localError);
    }

    return [];
  }
}

// Legacy function to get user's redemption history from events (deprecated)
export async function getUserRedemptionHistoryFromEvents(userAddress: string): Promise<Array<{
  lpAmount: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}>> {
  try {
    // Check in-memory cache first
    const cacheKey = userAddress.toLowerCase();
    const cachedEntry = redemptionHistoryCache.get(cacheKey);

    if (cachedEntry && isCacheValid(cachedEntry)) {
      console.log('Returning in-memory cached redemption history for', userAddress);
      return cachedEntry.data;
    }

    // Check localStorage cache
    const localStorageData = loadFromLocalStorage(REDEMPTION_CACHE_KEY);
    if (localStorageData && localStorageData[cacheKey]) {
      const localEntry = localStorageData[cacheKey];
      if (isCacheValid(localEntry)) {
        console.log('Returning localStorage cached redemption history for', userAddress);
        // Also update in-memory cache
        redemptionHistoryCache.set(cacheKey, localEntry);
        return localEntry.data;
      }
    }

    console.log(`Starting redemption history fetch for ${userAddress}...`);
    const contracts = getContracts();
    const provider = getProvider();

    // Add longer throttling delay to avoid concurrent queries with other data fetching
    await sleep(INTER_QUERY_DELAY_MS);

    // Get recent block range to avoid querying from genesis
    const { fromBlock, toBlock } = await getRecentBlockRange();

    console.log(`Fetching redemption history for ${userAddress} from block ${fromBlock} to ${toBlock} (${toBlock - fromBlock} blocks)`);

    // Get all Redeemed events for this user with pagination
    const filter = contracts.packageManager.filters.Redeemed(userAddress);
    const events = await queryEventsWithPagination(contracts.packageManager, filter, fromBlock, toBlock);

    console.log(`Found ${events.length} redemption events for ${userAddress}`);

    const redemptions: Array<{ lpAmount: bigint; timestamp: number; blockNumber: number; transactionHash: string }> = [];

    // Process events in smaller batches
    const batchSize = 5; // Reduced from 10 to 5 for better RPC handling
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      console.log(`Processing redemption batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)} (${batch.length} events)`);

      const batchPromises = batch.map(async (event) => {
        try {
          // Get block timestamp with retry logic
          let block;
          let retries = 0;
          while (retries < 3) {
            try {
              block = await provider.getBlock(event.blockNumber);
              break;
            } catch (err) {
              retries++;
              if (retries < 3) {
                await sleep(1000 * retries); // Progressive delay
              } else {
                console.warn(`Failed to get block ${event.blockNumber} after 3 retries`);
              }
            }
          }
          const timestamp = block ? block.timestamp : 0;

          return {
            lpAmount: event.args.lpAmount,
            timestamp,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
          };
        } catch (err) {
          console.warn('Error processing redemption event:', err);
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result: PromiseSettledResult<any>) => {
        if (result.status === 'fulfilled' && result.value) {
          redemptions.push(result.value as { lpAmount: bigint; timestamp: number; blockNumber: number; transactionHash: string });
        }
      });

      // Longer delay between batches
      if (i + batchSize < events.length) {
        await sleep(500); // Increased from 100ms to 500ms
      }
    }

    console.log(`Processed ${redemptions.length} redemption records`);

    // Sort by timestamp (newest first)
    const sortedRedemptions = redemptions.sort((a, b) => b.timestamp - a.timestamp);

    // Cache the result in memory
    const cacheEntry = {
      data: sortedRedemptions,
      timestamp: Date.now(),
      userAddress: userAddress.toLowerCase(),
      blockRange: { fromBlock, toBlock }
    };

    redemptionHistoryCache.set(cacheKey, cacheEntry);

    // Also save to localStorage
    try {
      const localStorageData = loadFromLocalStorage(REDEMPTION_CACHE_KEY) || {};
      localStorageData[cacheKey] = cacheEntry;
      saveToLocalStorage(REDEMPTION_CACHE_KEY, localStorageData);
    } catch (error) {
      console.warn('Failed to save redemption history to localStorage:', error);
    }

    return sortedRedemptions;
  } catch (error) {
    console.error('Error fetching redemption history:', error);

    // If we hit an error, try to return any cached data we have (even if expired)
    const cacheKey = userAddress.toLowerCase();
    const cachedEntry2 = redemptionHistoryCache.get(cacheKey);
    if (cachedEntry2) {
      console.log('Returning expired cached redemption data due to error');
      return cachedEntry2.data;
    }

    // Check localStorage for any cached data
    try {
      const localStorageData = loadFromLocalStorage(REDEMPTION_CACHE_KEY);
      if (localStorageData && localStorageData[cacheKey]) {
        console.log('Returning expired localStorage redemption data due to error');
        return localStorageData[cacheKey].data;
      }
    } catch (localError) {
      console.warn('Failed to load fallback redemption data from localStorage:', localError);
    }

    return [];
  }
}

// Contract event listeners (Ethers v6)
export function subscribeToPackagePurchases(
  callback: (packageId: number, buyer: string, amount: bigint) => void
) {
  const contracts = getContracts();

  contracts.packageManager.on('Purchased', (
    buyer,
    packageId,
    usdtAmount,
    _totalTokens,
    _vestTokens,
    _poolTokens,
    _lpTokens,
    _referrer,
    _referralReward,
    _event
  ) => {
    callback(Number(packageId), buyer, usdtAmount);
  });

  // Return unsubscribe function
  return () => {
    contracts.packageManager.removeAllListeners('Purchased');
  };
}

export function subscribeToVestingClaims(
  callback: (user: string, amount: bigint) => void
) {
  const contracts = getContracts();

  contracts.vestingVault.on('Claimed', (user, amount, _event) => {
    callback(user, amount);
  });

  // Return unsubscribe function
  return () => {
    contracts.vestingVault.removeAllListeners('Claimed');
  };
}

// --------- Lightweight TX hash cache for events (per user, per timestamp) ---------
const PURCHASE_TX_CACHE_KEY = 'blockcoop_purchase_txhash';
const REDEMPTION_TX_CACHE_KEY = 'blockcoop_redemption_txhash';

function setCachedTx(key: string, user: string, timestamp: number, txHash: string): void {
  try {
    const data = loadFromLocalStorage(key) || {};
    const userKey = user.toLowerCase();
    if (!data[userKey]) data[userKey] = {};
    data[userKey][String(timestamp)] = txHash;
    saveToLocalStorage(key, data);
  } catch (e) {
    console.warn('Failed to cache tx hash', key, e);
  }
}

function getCachedTx(key: string, user: string, timestamp: number): string | null {
  try {
    const data = loadFromLocalStorage(key) || {};
    const userKey = user.toLowerCase();
    return data[userKey]?.[String(timestamp)] || null;
  } catch {
    return null;
  }
}

export function setCachedPurchaseTx(user: string, timestamp: number, txHash: string): void {
  setCachedTx(PURCHASE_TX_CACHE_KEY, user, timestamp, txHash);
}

export function getCachedPurchaseTx(user: string, timestamp: number): string | null {
  return getCachedTx(PURCHASE_TX_CACHE_KEY, user, timestamp);
}

export function setCachedRedemptionTx(user: string, timestamp: number, txHash: string): void {
  setCachedTx(REDEMPTION_TX_CACHE_KEY, user, timestamp, txHash);
}

export function getCachedRedemptionTx(user: string, timestamp: number): string | null {
  return getCachedTx(REDEMPTION_TX_CACHE_KEY, user, timestamp);
}

// --------- Event subscriptions with tx hash enrichment ---------
export function subscribeToPurchasesWithHash(
  callback: (payload: {
    buyer: string;
    packageId: number;
    usdtAmount: bigint;
    totalTokens: bigint;
    vestTokens: bigint;
    poolTokens: bigint;
    lpTokens: bigint;
    referrer: string;
    referralReward: bigint;
    transactionHash: string;
    blockNumber: number;
    timestamp: number;
  }) => void
) {
  const contracts = getContracts();
  const provider = getProvider();

  const handler = async (
    buyer: string,
    packageId: bigint,
    usdtAmount: bigint,
    totalTokens: bigint,
    vestTokens: bigint,
    poolTokens: bigint,
    lpTokens: bigint,
    referrer: string,
    referralReward: bigint,
    event: any
  ) => {
    try {
      const block = await provider.getBlock(event.blockNumber);
      const timestamp = block?.timestamp ? Number(block.timestamp) : Math.floor(Date.now() / 1000);
      const txHash = event.transactionHash as string;
      // Cache by user+timestamp
      setCachedPurchaseTx(buyer, timestamp, txHash);

      callback({
        buyer,
        packageId: Number(packageId),
        usdtAmount,
        totalTokens,
        vestTokens,
        poolTokens,
        lpTokens,
        referrer,
        referralReward,
        transactionHash: txHash,
        blockNumber: event.blockNumber,
        timestamp,
      });
    } catch (e) {
      console.warn('subscribeToPurchasesWithHash handler error:', e);
    }
  };

  contracts.packageManager.on('Purchased', handler);
  return () => contracts.packageManager.off('Purchased', handler);
}

export function subscribeToRedemptionsWithHash(
  callback: (payload: {
    user: string;
    lpAmount: bigint;
    transactionHash: string;
    blockNumber: number;
    timestamp: number;
  }) => void
) {
  const contracts = getContracts();
  const provider = getProvider();

  const handler = async (
    user: string,
    lpAmount: bigint,
    event: any
  ) => {
    try {
      const block = await provider.getBlock(event.blockNumber);
      const timestamp = block?.timestamp ? Number(block.timestamp) : Math.floor(Date.now() / 1000);
      const txHash = event.transactionHash as string;
      setCachedRedemptionTx(user, timestamp, txHash);

      callback({ user, lpAmount, transactionHash: txHash, blockNumber: event.blockNumber, timestamp });
    } catch (e) {
      console.warn('subscribeToRedemptionsWithHash handler error:', e);
    }
  };

  contracts.packageManager.on('Redeemed', handler);
  return () => contracts.packageManager.off('Redeemed', handler);
}

// Network and connection utilities
export async function checkNetworkConnection(): Promise<boolean> {
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    return Number(network.chainId) === appKitConfig.chainId;
  } catch (error) {
    console.error('Network connection check failed:', error);
    return false;
  }
}

export async function waitForTransaction(
  txHash: string,
  confirmations: number = 1
): Promise<TransactionReceipt | null> {
  try {
    const provider = getProvider();
    return await provider.waitForTransaction(txHash, confirmations);
  } catch (error) {
    console.error('Error waiting for transaction:', error);
    return null;
  }
}

// Format utilities for display (Ethers v6)
export function formatTokenAmount(
  amount: bigint | null | undefined,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  // Handle null, undefined, or invalid values
  if (amount === null || amount === undefined) {
    return '0.0000';
  }

  try {
    return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(displayDecimals);
  } catch (error) {
    console.warn('Error formatting token amount:', error, 'amount:', amount);
    return '0.0000';
  }
}



export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  try {
    return ethers.parseUnits(amount, decimals);
  } catch (error) {
    console.error('Error parsing token amount:', error);
    return 0n;
  }
}

/**
 * Get enhanced liquidity addition events for a user
 */
export async function getLiquidityAddedEvents(userAddress: string): Promise<LiquidityAddedEvent[]> {
  try {
    const contracts = getContracts();
    const provider = getProvider();

    // Get events from the last 10000 blocks (adjust as needed)
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000);

    const filter = contracts.packageManager.filters.LiquidityAdded(userAddress);
    const events = await contracts.packageManager.queryFilter(filter, fromBlock, currentBlock);

    const liquidityEvents: LiquidityAddedEvent[] = [];

    for (const event of events as Array<any>) {
      if ((event as any).args) {
        const block = await provider.getBlock(event.blockNumber);
        liquidityEvents.push({
          user: (event as any).args[0],
          packageId: (event as any).args[1],
          shareTokenAmount: (event as any).args[2],
          usdtAmount: (event as any).args[3],
          liquidityTokens: (event as any).args[4],
          actualShareToken: (event as any).args[5],
          actualUSDT: (event as any).args[6],
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          timestamp: block?.timestamp || 0,
        });
      }
    }

    return liquidityEvents.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error fetching liquidity added events:', error);
    return [];
  }
}

/**
 * Get liquidity addition failed events for a user
 */
export async function getLiquidityFailedEvents(userAddress: string): Promise<LiquidityAdditionFailedEvent[]> {
  try {
    const contracts = getContracts();
    const provider = getProvider();

    // Get events from the last 10000 blocks
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000);

    const filter = contracts.packageManager.filters.LiquidityAdditionFailed(userAddress);
    const events = await contracts.packageManager.queryFilter(filter, fromBlock, currentBlock);

    const failedEvents: LiquidityAdditionFailedEvent[] = [];

    for (const event of events as Array<any>) {
      if ((event as any).args) {
        const block = await provider.getBlock(event.blockNumber);
        failedEvents.push({
          user: (event as any).args[0],
          packageId: (event as any).args[1],
          usdtAmount: (event as any).args[2],
          reason: (event as any).args[3],
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          timestamp: block?.timestamp || 0,
        });
      }
    }

    return failedEvents.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error fetching liquidity failed events:', error);
    return [];
  }
}

/**
 * Get all enhanced liquidity events for monitoring and transparency
 */
export async function getAllLiquidityEvents(userAddress: string): Promise<{
  successful: LiquidityAddedEvent[];
  failed: LiquidityAdditionFailedEvent[];
  totalAttempts: number;
  successRate: number;
}> {
  try {
    const [successful, failed] = await Promise.all([
      getLiquidityAddedEvents(userAddress),
      getLiquidityFailedEvents(userAddress),
    ]);

    const totalAttempts = successful.length + failed.length;
    const successRate = totalAttempts > 0 ? (successful.length / totalAttempts) * 100 : 0;

    return {
      successful,
      failed,
      totalAttempts,
      successRate,
    };
  } catch (error) {
    console.error('Error fetching all liquidity events:', error);
    return {
      successful: [],
      failed: [],
      totalAttempts: 0,
      successRate: 0,
    };
  }
}