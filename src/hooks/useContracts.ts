import { useCallback, useEffect, useState, useMemo } from 'react';
import { ContractTransactionResponse, ethers } from 'ethers';
import { useWeb3 } from '../providers/Web3Provider';
import { useRefreshListener } from '../contexts/RefreshContext';
import {
  Package,
  PurchaseRecord,
  EnhancedVestingInfo,
  UserStats,
  getAllPackages,
  getPackageById,
  getUSDTBalance,
  getShareTokenBalance,
  getLPTokenBalance,
  getVestingInfo,
  getUserPurchaseHistory,
  getUserRedemptionHistory,
  // getUserPurchaseHistoryFromEvents,
  // getUserRedemptionHistoryFromEvents,
  getUserPortfolioStats,
  formatTokenAmount,
  subscribeToPurchasesWithHash,
  subscribeToRedemptionsWithHash,
} from '../lib/contracts';

// Hook for package operations
export function usePackages() {
  const { contracts, isConnected } = useWeb3();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    if (!contracts.packageManager) return [];

    setLoading(true);
    setError(null);

    try {
      const packageList = await getAllPackages();
      setPackages(packageList);
      return packageList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch packages';
      setError(errorMessage);
      console.error('Error fetching packages:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [contracts.packageManager]);

  const fetchPackageById = useCallback(async (id: number): Promise<Package | null> => {
    if (!contracts.packageManager) return null;

    try {
      return await getPackageById(id);
    } catch (err) {
      console.error('Error fetching package by ID:', err);
      return null;
    }
  }, [contracts.packageManager]);

  // Auto-refresh on package data events
  useRefreshListener('refreshPackageData', fetchPackages);

  // Initial fetch
  useEffect(() => {
    if (contracts.packageManager) {
      fetchPackages();
    }
  }, [contracts.packageManager, fetchPackages]);

  return {
    packages,
    loading,
    error,
    fetchPackages,
    fetchPackageById,
    refetch: fetchPackages,
  };
}

// Hook for balance operations (Ethers v6 - using bigint)
export function useBalances() {
  const { account, contracts, isConnected } = useWeb3();
  const [balances, setBalances] = useState({
    usdt: 0n,
    share: 0n,
    lp: 0n,
    native: 0n,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!account || !isConnected) {
      setBalances({
        usdt: 0n,
        share: 0n,
        lp: 0n,
        native: 0n,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [usdtBalance, shareBalance, lpBalance] = await Promise.all([
        getUSDTBalance(account),
        getShareTokenBalance(account),
        getLPTokenBalance(account),
      ]);

      // Get native balance if provider is available
      let nativeBalance = 0n;
      if (contracts.packageManager?.provider) {
        try {
          nativeBalance = await contracts.packageManager.provider.getBalance(account);
        } catch (err) {
          console.warn('Could not fetch native balance:', err);
        }
      }

      const newBalances = {
        usdt: usdtBalance,
        share: shareBalance,
        lp: lpBalance,
        native: nativeBalance,
      };

      setBalances(newBalances);
      return newBalances;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balances';
      setError(errorMessage);
      console.error('Error fetching balances:', err);
    } finally {
      setLoading(false);
    }
  }, [account, isConnected, contracts.packageManager]);

  // Auto-refresh on balance events
  useRefreshListener('refreshBalances', fetchBalances);

  // Auto-refresh when account changes
  useEffect(() => {
    fetchBalances();
  }, [account, isConnected, fetchBalances]);

  // Formatted balance getters with correct decimals and null safety
  const formattedBalances = {
    usdt: formatTokenAmount(balances.usdt || 0n, 18, 2), // USDT now uses 18 decimals in V2
    share: formatTokenAmount(balances.share || 0n, 18, 4),
    lp: formatTokenAmount(balances.lp || 0n, 18, 4),
    native: formatTokenAmount(balances.native || 0n, 18, 4),
  };

  return {
    balances,
    formattedBalances,
    loading,
    error,
    fetchBalances,
    refetch: fetchBalances,
  };
}


// Hook for enhanced balances that uses raw on-chain data
export function useEnhancedBalances() {
  const { balances, formattedBalances, loading: balancesLoading, error: balancesError, refetch: refetchBalances } = useBalances();
  const { stats, loading: statsLoading, error: statsError } = useUserPortfolioStats();

  const enhancedFormattedBalances = {
    ...formattedBalances,
    // Use raw wallet balances for display
    share: formatTokenAmount(balances.share, 18, 4),
    usdt: formatTokenAmount(balances.usdt, 18, 2),
    lp: formatTokenAmount(balances.lp, 18, 4),
    // Portfolio totals from raw stats
    shareTotal: formatTokenAmount(stats?.totalTokensReceived || 0n, 18, 4),
    shareWallet: formatTokenAmount(balances.share, 18, 4),
  };

  return {
    balances, // Raw balances for calculations
    formattedBalances: enhancedFormattedBalances,
    loading: balancesLoading || statsLoading,
    error: balancesError || statsError,
    refetch: refetchBalances,
    correctionApplied: false, // No corrections applied
  };
}

// Hook for vesting operations
export function useVesting() {
  const { account, contracts, signer, isConnected } = useWeb3();
  const [vestingInfo, setVestingInfo] = useState<EnhancedVestingInfo>({
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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVestingInfo = useCallback(async () => {
    if (!account || !contracts.vestingVault) {
      setVestingInfo({
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
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const info = await getVestingInfo(account);
      setVestingInfo(info);
      return info;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch vesting info';
      setError(errorMessage);
      console.error('Error fetching vesting info:', err);
    } finally {
      setLoading(false);
    }
  }, [account, contracts.vestingVault]);

  const claimVested = useCallback(async (): Promise<ContractTransactionResponse | null> => {
    if (!signer || !contracts.vestingVault) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      const contractWithSigner = contracts.vestingVault.connect(signer);
      const tx = await contractWithSigner.claim();
      return tx;
    } catch (err) {
      console.error('Error claiming vested tokens:', err);
      throw err;
    }
  }, [signer, contracts.vestingVault]);

  // Auto-refresh on vesting events
  useRefreshListener('refreshVestingData', fetchVestingInfo);

  // Auto-refresh when account changes
  useEffect(() => {
    fetchVestingInfo();
  }, [account, isConnected, fetchVestingInfo]);

  // Formatted vesting info with null safety
  const formattedVestingInfo = {
    totalVested: formatTokenAmount(vestingInfo.totalVested || 0n, 18, 4),
    claimable: formatTokenAmount(vestingInfo.claimable || 0n, 18, 4),
    claimed: formatTokenAmount(vestingInfo.claimed || 0n, 18, 4),
    remaining: formatTokenAmount(vestingInfo.remaining || 0n, 18, 4),
    cliffEndDate: vestingInfo.cliffEndTime > 0n ? new Date(Number(vestingInfo.cliffEndTime) * 1000) : null,
    vestingEndDate: vestingInfo.vestingEndTime > 0n ? new Date(Number(vestingInfo.vestingEndTime) * 1000) : null,
    startDate: vestingInfo.schedule.start > 0n ? new Date(Number(vestingInfo.schedule.start) * 1000) : null,
    cliffDuration: vestingInfo.schedule.cliff > 0n ? Number(vestingInfo.schedule.cliff) / (24 * 60 * 60) : 0, // days
    totalDuration: vestingInfo.schedule.duration > 0n ? Number(vestingInfo.schedule.duration) / (24 * 60 * 60) : 0, // days
    vestingProgress: vestingInfo.vestingProgress,
    isCliffPassed: vestingInfo.isCliffPassed,
    isFullyVested: vestingInfo.isFullyVested,
  };

  return {
    vestingInfo,
    formattedVestingInfo,
    loading,
    error,
    fetchVestingInfo,
    claimVested,
    refetch: fetchVestingInfo,
  };
}

// Hook for corrected vesting that applies portfolio corrections to vesting amounts

// Hook for transaction operations
export function useTransactions() {
  const { signer, account, isCorrectNetwork } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeTransaction = useCallback(async (
    transactionFn: () => Promise<any>,
    options?: {
      onSuccess?: (tx: any) => void;
      onError?: (error: Error) => void;
      waitForConfirmation?: boolean;
    }
  ): Promise<any | null> => {
    if (!signer || !account) {
      const error = new Error('Wallet not connected');
      options?.onError?.(error);
      throw error;
    }

    if (!isCorrectNetwork) {
      const error = new Error('Wrong network. Please switch to BSC Testnet');
      options?.onError?.(error);
      throw error;
    }

    setLoading(true);
    setError(null);

    try {
      const tx = await transactionFn();

      options?.onSuccess?.(tx);

      if (options?.waitForConfirmation) {
        await tx.wait();
      }

      return tx;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Transaction failed');
      setError(error.message);
      options?.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [signer, account, isCorrectNetwork]);

  return {
    executeTransaction,
    loading,
    error,
  };
}

// Hook for network validation
export function useNetworkValidation() {
  const { chainId, isConnected, switchToCorrectNetwork } = useWeb3();
  const [isValidating, setIsValidating] = useState(false);

  const isCorrectNetwork = chainId === 97 || chainId === 56; // BSC Testnet or Mainnet

  const validateAndSwitchNetwork = useCallback(async (): Promise<boolean> => {
    if (isCorrectNetwork) return true;

    setIsValidating(true);
    try {
      const success = await switchToCorrectNetwork();
      return success;
    } catch (error) {
      console.error('Failed to switch network:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [isCorrectNetwork, switchToCorrectNetwork]);

  return {
    isCorrectNetwork,
    isConnected,
    chainId,
    isValidating,
    validateAndSwitchNetwork,
  };
}

// Hook to fetch current market price from AMM
export function useCurrentMarketPrice() {
  const { contracts, isConnected } = useWeb3();
  const [marketPrice, setMarketPrice] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketPrice = useCallback(async () => {
    if (!isConnected || !contracts) {
      setMarketPrice(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [price, hasLiquidity] = await contracts.packageManager.getCurrentMarketPrice();
      setMarketPrice(price);
      
      // Debug logging
      const priceFormatted = formatTokenAmount(price, 18, 4);
      console.log('Market price fetch result:', {
        price: priceFormatted,
        hasLiquidity,
        priceRaw: price.toString(),
        source: hasLiquidity ? 'AMM' : 'Global Target Price'
      });
      
      if (!hasLiquidity) {
        console.warn('No AMM liquidity found, using global target price');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market price';
      setError(errorMessage);
      console.error('Error fetching market price:', err);
    } finally {
      setLoading(false);
    }
  }, [contracts, isConnected]);

  // Auto-refresh on purchase/redemption events
  useRefreshListener('refreshPurchaseHistory', fetchMarketPrice);

  useEffect(() => {
    fetchMarketPrice();
  }, [fetchMarketPrice]);

  return {
    marketPrice,
    loading,
    error,
    refetch: fetchMarketPrice,
  };
}

// Hook for user purchase history
export function usePurchaseHistory() {
  const { account, isConnected } = useWeb3();
  const { marketPrice } = useCurrentMarketPrice();
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [redemptions, setRedemptions] = useState<Array<{
    lpAmount: bigint;
    timestamp: number;
    blockNumber: number;
    transactionHash: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchaseHistory = useCallback(async () => {
    if (!account || !isConnected) {
      setPurchases([]);
      setRedemptions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching purchase and redemption history...');

      // Fetch purchase and redemption history via view functions only (avoid rate-limited logs)
      const [purchaseResult, redemptionResult] = await Promise.allSettled([
        getUserPurchaseHistory(account),
        getUserRedemptionHistory(account),
      ]);

      // Handle purchase history result
      let purchaseHistory: PurchaseRecord[] = [];
      if (purchaseResult.status === 'fulfilled') {
        purchaseHistory = purchaseResult.value;
        console.log(`Successfully fetched ${purchaseHistory.length} purchase records`);
      } else {
        console.error('Failed to fetch purchase history:', purchaseResult.reason);
      }

      // Skip event enrichment to avoid RPC logs rate limits

      // Handle redemption history result
      let redemptionHistory: Array<{
        lpAmount: bigint;
        timestamp: number;
        blockNumber: number;
        transactionHash: string;
      }> = [];
      if (redemptionResult.status === 'fulfilled') {
        redemptionHistory = redemptionResult.value;
        console.log(`Successfully fetched ${redemptionHistory.length} redemption records`);
      } else {
        console.error('Failed to fetch redemption history:', redemptionResult.reason);
      }

      // Skip event enrichment to avoid RPC logs rate limits

      // Use raw purchase history without corrections
      setPurchases(purchaseHistory);
      setRedemptions(redemptionHistory);

      // Set error only if both failed
      if (purchaseResult.status === 'rejected' && redemptionResult.status === 'rejected') {
        setError('Failed to fetch transaction history. Please try again later.');
      } else if (purchaseResult.status === 'rejected') {
        setError('Failed to fetch purchase history. Redemption history loaded successfully.');
      } else if (redemptionResult.status === 'rejected') {
        setError('Failed to fetch redemption history. Purchase history loaded successfully.');
      }

      return { purchases: purchaseHistory, redemptions: redemptionHistory };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transaction history';
      setError(errorMessage);
      console.error('Error fetching purchase history:', err);

      // Still return empty arrays so the UI can render
      setPurchases([]);
      setRedemptions([]);
    } finally {
      setLoading(false);
    }
  }, [account, isConnected]);

  // Auto-refresh on purchase/redemption events
  useRefreshListener('refreshPurchaseHistory', fetchPurchaseHistory);

  // Live event subscriptions to hydrate tx hashes for future records
  useEffect(() => {
    if (!account) return;

    const offPurchase = subscribeToPurchasesWithHash(() => {
      // Refresh purchase history to pick up cached tx hashes
      fetchPurchaseHistory();
    });

    const offRedemption = subscribeToRedemptionsWithHash(() => {
      // Refresh redemption history to pick up cached tx hashes
      fetchPurchaseHistory();
    });

    return () => {
      offPurchase?.();
      offRedemption?.();
    };
  }, [account, fetchPurchaseHistory]);

  // Auto-refresh when account changes
  useEffect(() => {
    fetchPurchaseHistory();
  }, [account, isConnected, fetchPurchaseHistory]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    const totalInvested = purchases.reduce((sum, purchase) => sum + purchase.usdtAmount, 0n);
    const totalTokensReceived = purchases.reduce((sum, purchase) => sum + purchase.totalTokens, 0n);
    const totalVestTokens = purchases.reduce((sum, purchase) => sum + purchase.vestTokens, 0n);
    const totalPoolTokens = purchases.reduce((sum, purchase) => sum + purchase.poolTokens, 0n);
    const totalLPTokens = purchases.reduce((sum, purchase) => sum + purchase.lpTokens, 0n);
    const totalRedemptions = redemptions.reduce((sum, redemption) => sum + redemption.lpAmount, 0n);

    // Calculate performance metrics
    const currentLPTokens = totalLPTokens - totalRedemptions;

    // ROI calculation based on current market price vs USDT invested
    let roi = 0;
    if (totalInvested > 0n && totalTokensReceived > 0n && marketPrice) {
      // Convert to numbers safely to avoid BigInt overflow
      const investedNumber = Number(totalInvested) / 1e18; // USDT has 18 decimals in V2 architecture
      const tokensNumber = Number(totalTokensReceived) / 1e18; // ShareTokens have 18 decimals
      const currentBLOCKSPrice = Number(marketPrice) / 1e18; // Market price is in 18 decimals
      
      // Calculate current value of tokens
      const currentValue = tokensNumber * currentBLOCKSPrice;
      
      // Calculate ROI as percentage
      if (investedNumber > 0) {
        roi = ((currentValue - investedNumber) / investedNumber) * 100;
      }
    }

    return {
      totalInvested,
      totalTokensReceived,
      totalVestTokens,
      totalPoolTokens,
      totalLPTokens,
      totalRedemptions,
      currentLPTokens,
      purchaseCount: purchases.length,
      redemptionCount: redemptions.length,
      roi,
    };
  }, [purchases, redemptions]);

  // Formatted summary for display with consistent USDT decimals
  const getUSDTDecimals = (): number => {
    return 18; // V2 architecture uses 18 decimals
  };

  const usdtDecimals = getUSDTDecimals();

  const formattedSummary = {
    totalInvested: formatTokenAmount(summary.totalInvested, usdtDecimals, 2), // Auto-detect USDT decimals
    totalTokensReceived: formatTokenAmount(summary.totalTokensReceived, 18, 4),
    totalVestTokens: formatTokenAmount(summary.totalVestTokens, 18, 4),
    totalPoolTokens: formatTokenAmount(summary.totalPoolTokens, 18, 4),
    totalLPTokens: formatTokenAmount(summary.totalLPTokens, 18, 4),
    totalRedemptions: formatTokenAmount(summary.totalRedemptions, 18, 4),
    currentLPTokens: formatTokenAmount(summary.currentLPTokens, 18, 4),
    purchaseCount: summary.purchaseCount,
    redemptionCount: summary.redemptionCount,
    roi: summary.roi,
  };

  // Formatted redemptions for display
  const formattedRedemptions = redemptions.map(redemption => ({
    ...redemption,
    formattedAmount: formatTokenAmount(redemption.lpAmount, 18, 4),
    date: new Date(redemption.timestamp * 1000),
  }));

  return {
    purchases,
    redemptions,
    formattedRedemptions,
    summary,
    formattedSummary,
    loading,
    error,
    fetchPurchaseHistory,
    refetch: fetchPurchaseHistory,
  };
}

// New hook for efficient user portfolio stats using smart contract view functions
export function useUserPortfolioStats() {
  const { account, isConnected } = useWeb3();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!account || !isConnected) {
      setStats(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching user portfolio stats from smart contract...');
      const userStats = await getUserPortfolioStats(account);

      if (userStats) {
        setStats(userStats);
        console.log('Successfully fetched user portfolio stats');
      } else {
        setError('Failed to fetch portfolio stats');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch portfolio stats';
      setError(errorMessage);
      console.error('Error fetching portfolio stats:', err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [account, isConnected]);

  // Auto-refresh on purchase/redemption events
  useRefreshListener('refreshPortfolioStats', fetchStats);

  // Auto-refresh when account changes
  useEffect(() => {
    fetchStats();
  }, [account, isConnected, fetchStats]);

  // Formatted stats for display with null safety
  const formattedStats = useMemo(() => {
    if (!stats) return null;

    // Use consistent USDT decimal precision for portfolio stats
    const usdtDecimals = 18; // V2 architecture uses 18 decimals

    return {
      totalInvested: formatTokenAmount(stats.totalInvested || 0n, usdtDecimals, 2), // Auto-detect USDT decimals
      totalTokensReceived: formatTokenAmount(stats.totalTokensReceived || 0n, 18, 4),
      totalVestTokens: formatTokenAmount(stats.totalVestTokens || 0n, 18, 4),
      totalPoolTokens: formatTokenAmount(stats.totalPoolTokens || 0n, 18, 4),
      totalLPTokens: formatTokenAmount(stats.totalLPTokens || 0n, 18, 4),
      totalReferralRewards: formatTokenAmount(stats.totalReferralRewards || 0n, 18, 4),
      totalRedemptions: formatTokenAmount(stats.totalRedemptions || 0n, 18, 4),
      purchaseCount: Number(stats.purchaseCount || 0n),
      redemptionCount: Number(stats.redemptionCount || 0n),
    };
  }, [stats]);

  return {
    stats,
    formattedStats,
    loading,
    error,
    fetchStats,
    refetch: fetchStats,
  };
}

// Enhanced hook for user portfolio stats with correction for inflated historical data
