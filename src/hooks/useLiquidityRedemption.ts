import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../providers/Web3Provider';
import { useRefreshListener } from '../contexts/RefreshContext';
import {
  getLiquidityRemovalPreview,
  redeemLPTokensWithLiquidityRemoval,
  redeemLPTokensWithContractLiquidityRemoval,
  getContractRedemptionPreview,
  getTokenPricesFromPool,
} from '../lib/contracts';
import {
  LiquidityRemovalPreview,
  SlippageConfig,
  MEVProtection,
  DEFAULT_SLIPPAGE_CONFIG,
  DEFAULT_MEV_PROTECTION,
} from '../lib/liquidityManager';
import { MEVProtectionConfig } from '../components/liquidity/MEVProtectionSettings';

export interface LiquidityRedemptionState {
  preview: LiquidityRemovalPreview | null;
  tokenPrices: { shareTokenPriceInUSDT: number; usdtPriceInShareToken: number } | null;
  loading: boolean;
  error: string | null;
}

export interface LiquidityRedemptionConfig {
  slippage: SlippageConfig;
  mevProtection: MEVProtection;
}

// Convert MEVProtectionConfig to MEVProtection
const convertMEVConfig = (config: MEVProtectionConfig): MEVProtection => ({
  enabled: config.enabled,
  usePrivateMempool: config.usePrivateMempool,
  maxGasPrice: config.maxGasPrice,
  priorityFee: config.priorityFee,
  deadline: config.deadline * 60, // Convert minutes to seconds
  frontrunProtection: config.frontrunProtection,
  sandwichProtection: config.sandwichProtection,
  flashloanProtection: config.flashloanProtection,
});

/**
 * Enhanced hook for LP token redemption with actual liquidity removal
 */
export function useLiquidityRedemption() {
  const { signer, isConnected } = useWeb3();
  const [state, setState] = useState<LiquidityRedemptionState>({
    preview: null,
    tokenPrices: null,
    loading: false,
    error: null,
  });

  const [config, setConfig] = useState<LiquidityRedemptionConfig>({
    slippage: DEFAULT_SLIPPAGE_CONFIG,
    mevProtection: DEFAULT_MEV_PROTECTION,
  });

  // Update slippage configuration
  const updateSlippageConfig = useCallback((newConfig: Partial<SlippageConfig>) => {
    setConfig(prev => ({
      ...prev,
      slippage: { ...prev.slippage, ...newConfig },
    }));
  }, []);

  // Update MEV protection configuration
  const updateMEVProtection = useCallback((newConfig: Partial<MEVProtection>) => {
    setConfig(prev => ({
      ...prev,
      mevProtection: { ...prev.mevProtection, ...newConfig },
    }));
  }, []);

  // Update MEV protection from UI config
  const updateMEVProtectionFromConfig = useCallback((mevConfig: MEVProtectionConfig) => {
    const convertedConfig = convertMEVConfig(mevConfig);
    setConfig(prev => ({
      ...prev,
      mevProtection: convertedConfig,
    }));
  }, []);

  // Get liquidity removal preview (using smart contract)
  const getPreview = useCallback(async (lpAmount: bigint): Promise<LiquidityRemovalPreview | null> => {
    if (!signer || !isConnected || lpAmount <= 0n) {
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Try to get preview from smart contract first
      const contractPreview = await getContractRedemptionPreview(lpAmount, signer);

      // Convert to LiquidityRemovalPreview format
      const preview: LiquidityRemovalPreview = {
        lpTokenAmount: lpAmount,
        expectedUSDT: contractPreview.expectedUSDT,
        expectedShareToken: contractPreview.expectedShare,
        minimumUSDT: contractPreview.expectedUSDT - (contractPreview.expectedUSDT * BigInt(Math.floor(config.slippage.tolerance * 100))) / 10000n,
        minimumShareToken: contractPreview.expectedShare - (contractPreview.expectedShare * BigInt(Math.floor(config.slippage.tolerance * 100))) / 10000n,
        priceImpact: Number(contractPreview.liquidityToRemove) / Number(lpAmount) * 0.1, // Simplified price impact calculation
        slippageTolerance: config.slippage.tolerance,
      };

      setState(prev => ({ ...prev, preview, loading: false }));
      return preview;
    } catch (error: any) {
      console.error('Failed to get contract preview, falling back to client-side calculation:', error);

      // Fallback to client-side calculation
      try {
        const preview = await getLiquidityRemovalPreview(lpAmount, signer, config.slippage);
        setState(prev => ({ ...prev, preview, loading: false }));
        return preview;
      } catch (fallbackError: any) {
        console.error('Failed to get liquidity removal preview:', fallbackError);
        setState(prev => ({
          ...prev,
          error: fallbackError.message || 'Failed to get preview',
          loading: false,
        }));
        return null;
      }
    }
  }, [signer, isConnected, config.slippage]);

  // Execute liquidity removal (using smart contract)
  const executeLiquidityRemoval = useCallback(async (lpAmount: bigint) => {
    if (!signer || !isConnected) {
      throw new Error('Wallet not connected');
    }

    if (!state.preview) {
      throw new Error('No preview available. Please get a preview first.');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Calculate deadline timestamp
      const deadline = Math.floor(Date.now() / 1000) + (config.slippage.deadline * 60);

      // Use smart contract function for enhanced liquidity removal
      const tx = await redeemLPTokensWithContractLiquidityRemoval(
        lpAmount,
        state.preview.minimumShareToken,
        state.preview.minimumUSDT,
        deadline,
        signer
      );

      setState(prev => ({ ...prev, loading: false }));
      return tx;
    } catch (error: any) {
      console.error('Failed to execute contract liquidity removal, trying fallback:', error);

      // Fallback to client-side liquidity removal
      try {
        const tx = await redeemLPTokensWithLiquidityRemoval(
          lpAmount,
          signer,
          config.slippage,
          config.mevProtection
        );

        setState(prev => ({ ...prev, loading: false }));
        return tx;
      } catch (fallbackError: any) {
        console.error('Failed to execute liquidity removal:', fallbackError);
        setState(prev => ({
          ...prev,
          error: fallbackError.message || 'Failed to remove liquidity',
          loading: false,
        }));
        throw fallbackError;
      }
    }
  }, [signer, isConnected, config, state.preview]);

  // Get current token prices
  const fetchTokenPrices = useCallback(async () => {
    if (!signer || !isConnected) {
      return;
    }

    try {
      const prices = await getTokenPricesFromPool(signer);
      setState(prev => ({ ...prev, tokenPrices: prices }));
    } catch (error: any) {
      console.error('Failed to fetch token prices:', error);
      // Don't set error state for price fetching as it's not critical
    }
  }, [signer, isConnected]);

  // Clear preview
  const clearPreview = useCallback(() => {
    setState(prev => ({ ...prev, preview: null, error: null }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-refresh token prices
  useRefreshListener('refreshTokenPrices', fetchTokenPrices);

  // Fetch token prices when connected
  useEffect(() => {
    if (isConnected && signer) {
      fetchTokenPrices();
    }
  }, [isConnected, signer, fetchTokenPrices]);

  return {
    // State
    preview: state.preview,
    tokenPrices: state.tokenPrices,
    loading: state.loading,
    error: state.error,
    config,

    // Actions
    getPreview,
    executeLiquidityRemoval,
    fetchTokenPrices,
    clearPreview,
    clearError,
    updateSlippageConfig,
    updateMEVProtection,
    updateMEVProtectionFromConfig,

    // Computed values
    hasPreview: state.preview !== null,
    canExecute: state.preview !== null && !state.loading && !state.error,
  };
}

/**
 * Hook for slippage tolerance management
 */
export function useSlippageTolerance(initialTolerance: number = 0.5) {
  const [tolerance, setTolerance] = useState(initialTolerance);

  const updateTolerance = useCallback((newTolerance: number) => {
    // Validate tolerance range (0.1% to 50%)
    const clampedTolerance = Math.max(0.1, Math.min(50, newTolerance));
    setTolerance(clampedTolerance);
  }, []);

  const getSlippageConfig = useCallback((deadline: number = 300): SlippageConfig => ({
    tolerance,
    deadline,
  }), [tolerance]);

  return {
    tolerance,
    updateTolerance,
    getSlippageConfig,
    isHighSlippage: tolerance > 5,
    isVeryHighSlippage: tolerance > 15,
  };
}

/**
 * Hook for MEV protection settings
 */
export function useMEVProtection() {
  const [protection, setProtection] = useState<MEVProtection>(DEFAULT_MEV_PROTECTION);

  const updateProtection = useCallback((updates: Partial<MEVProtection>) => {
    setProtection(prev => ({ ...prev, ...updates }));
  }, []);

  const enablePrivateMempool = useCallback(() => {
    setProtection(prev => ({ ...prev, usePrivateMempool: true }));
  }, []);

  const disablePrivateMempool = useCallback(() => {
    setProtection(prev => ({ ...prev, usePrivateMempool: false }));
  }, []);

  return {
    protection,
    updateProtection,
    enablePrivateMempool,
    disablePrivateMempool,
    isProtected: protection.usePrivateMempool,
  };
}

/**
 * Utility hook for formatting liquidity removal data
 */
export function useLiquidityFormatting() {
  const formatTokenAmount = useCallback((amount: bigint, decimals: number = 18): string => {
    return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(6);
  }, []);

  const formatUSDTAmount = useCallback((amount: bigint): string => {
    // Use consistent 18 decimals for V2 architecture
    return parseFloat(ethers.formatUnits(amount, 18)).toFixed(2);
  }, []);

  const formatPercentage = useCallback((value: number): string => {
    return `${value.toFixed(2)}%`;
  }, []);

  const formatPriceImpact = useCallback((impact: number): { text: string; color: string } => {
    const text = formatPercentage(impact);
    let color = 'text-green-600';
    
    if (impact > 0.1) color = 'text-yellow-600';
    if (impact > 1) color = 'text-orange-600';
    if (impact > 3) color = 'text-red-600';
    
    return { text, color };
  }, [formatPercentage]);

  return {
    formatTokenAmount,
    formatUSDTAmount,
    formatPercentage,
    formatPriceImpact,
  };
}
