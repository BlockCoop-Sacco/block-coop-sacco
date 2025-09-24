import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { useWeb3 } from '../providers/Web3Provider';
import { useRefreshListener } from '../contexts/RefreshContext';
import { appKitConfig } from '../lib/appkit';
import { getProvider, getGlobalTargetPrice, getContracts } from '../lib/contracts';

// SecondaryMarket ABI - only the functions we need (based on actual contract)
const SECONDARY_MARKET_ABI = [
  // Read functions
  'function getSwapQuote(uint256 blocksAmount) external view returns (uint256 usdtAmount)',
  'function targetPrice() external view returns (uint256)',
  'function swapFee() external view returns (uint256)',
  'function paused() external view returns (bool)',
  'function factory() external view returns (address)',
  'function router() external view returns (address)',
  'function token() external view returns (address)',
  'function usdtToken() external view returns (address)',
  'function feeRecipient() external view returns (address)',

  // Write functions
  'function swapUSDTForBLOCKS(uint256 usdtAmount, uint256 minBlocksAmount) external',
  'function swapBLOCKSForUSDT(uint256 blocksAmount, uint256 minUsdtAmount) external',

  // Events
  'event TokensSwapped(address indexed user, uint256 blocksAmount, uint256 usdtAmount)'
];

// ERC20 ABI for token operations
const ERC20_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)'
];

export interface SwapQuote {
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact: number;
  minimumOutput: bigint;
  tradingFee: bigint;
  exchangeRate: number;
}

export interface MarketStats {
  targetPrice: bigint;
  tradingFee: number; // in basis points
  slippageTolerance: number; // in basis points
  marketMakingEnabled: boolean;
  marketPrice?: bigint; // AMM price (USDT per BLOCKS, 18 decimals)
  hasLiquidity?: boolean;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  allowance: bigint;
}

export function useSecondaryMarketSwap() {
  const { provider, signer, account, isConnected, isCorrectNetwork } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [usdtInfo, setUsdtInfo] = useState<TokenInfo | null>(null);
  const [blocksInfo, setBlocksInfo] = useState<TokenInfo | null>(null);

  // Check if SecondaryMarket is available
  const isSecondaryMarketEnabled = Boolean(appKitConfig.contracts.secondaryMarket);

  // Create contract instances for read operations (using dedicated JsonRpcProvider)
  const getReadOnlyContracts = useCallback(() => {
    if (!isSecondaryMarketEnabled) return null;

    const readProvider = getProvider();

    const secondaryMarket = new ethers.Contract(
      appKitConfig.contracts.secondaryMarket!,
      SECONDARY_MARKET_ABI,
      readProvider
    );

    const usdtToken = new ethers.Contract(
      appKitConfig.contracts.usdt,
      ERC20_ABI,
      readProvider
    );

    const blocksToken = new ethers.Contract(
      appKitConfig.contracts.share,
      ERC20_ABI,
      readProvider
    );

    return { secondaryMarket, usdtToken, blocksToken };
  }, [isSecondaryMarketEnabled]);

  // Create contract instances for write operations (using signer)
  const getWriteContracts = useCallback(() => {
    if (!signer || !isSecondaryMarketEnabled) return null;

    const secondaryMarket = new ethers.Contract(
      appKitConfig.contracts.secondaryMarket!,
      SECONDARY_MARKET_ABI,
      signer
    );

    const usdtToken = new ethers.Contract(
      appKitConfig.contracts.usdt,
      ERC20_ABI,
      signer
    );

    const blocksToken = new ethers.Contract(
      appKitConfig.contracts.share,
      ERC20_ABI,
      signer
    );

    return { secondaryMarket, usdtToken, blocksToken };
  }, [signer, isSecondaryMarketEnabled]);

  // Fetch market statistics
  const fetchMarketStats = useCallback(async () => {
    if (!isSecondaryMarketEnabled) return;

    const contracts = getReadOnlyContracts();
    if (!contracts) return;

    try {
      setLoading(true);

      // Read fee/paused in parallel; handle targetPrice with graceful fallback
      const [swapFee, isPaused] = await Promise.all([
        contracts.secondaryMarket.swapFee(),
        contracts.secondaryMarket.paused()
      ]);

      let targetPrice: bigint;
      try {
        targetPrice = await contracts.secondaryMarket.targetPrice();
      } catch (e: any) {
        console.warn('targetPrice() failed; falling back to PackageManager global target price', e);
        targetPrice = await getGlobalTargetPrice();
      }

      // Also read AMM market price and liquidity flag from PackageManager
      let marketPrice: bigint | undefined = undefined;
      let hasLiquidity: boolean | undefined = undefined;
      try {
        const pm = getContracts().packageManager;
        const res = await pm.getCurrentMarketPrice();
        marketPrice = BigInt(res[0]);
        hasLiquidity = Boolean(res[1]);
      } catch (e) {
        console.warn('getCurrentMarketPrice() failed; will rely on targetPrice for quotes');
      }

      setMarketStats({
        targetPrice,
        tradingFee: Number(swapFee),
        slippageTolerance: 100, // Default 1% slippage tolerance
        marketMakingEnabled: !isPaused, // Market is enabled when not paused
        marketPrice,
        hasLiquidity,
      });
    } catch (err: any) {
      console.error('Error fetching market stats:', err);
      setError(err.message || 'Failed to fetch market statistics');
    } finally {
      setLoading(false);
    }
  }, [getReadOnlyContracts, isSecondaryMarketEnabled]);

  // Fetch token information and balances
  const fetchTokenInfo = useCallback(async () => {
    if (!account || !isSecondaryMarketEnabled) return;

    const contracts = getReadOnlyContracts();
    if (!contracts) return;

    try {
      setLoading(true);

      // Fetch USDT info
      const [usdtSymbol, usdtName, usdtDecimals, usdtBalance, usdtAllowance] = await Promise.all([
        contracts.usdtToken.symbol(),
        contracts.usdtToken.name(),
        contracts.usdtToken.decimals(),
        contracts.usdtToken.balanceOf(account),
        contracts.usdtToken.allowance(account, appKitConfig.contracts.secondaryMarket!)
      ]);

      setUsdtInfo({
        address: appKitConfig.contracts.usdt,
        symbol: usdtSymbol,
        name: usdtName,
        decimals: Number(usdtDecimals),
        balance: usdtBalance,
        allowance: usdtAllowance
      });

      // Fetch BLOCKS info
      const [blocksSymbol, blocksName, blocksDecimals, blocksBalance, blocksAllowance] = await Promise.all([
        contracts.blocksToken.symbol(),
        contracts.blocksToken.name(),
        contracts.blocksToken.decimals(),
        contracts.blocksToken.balanceOf(account),
        contracts.blocksToken.allowance(account, appKitConfig.contracts.secondaryMarket!)
      ]);

      setBlocksInfo({
        address: appKitConfig.contracts.share,
        symbol: blocksSymbol,
        name: blocksName,
        decimals: Number(blocksDecimals),
        balance: blocksBalance,
        allowance: blocksAllowance
      });
    } catch (err: any) {
      console.error('Error fetching token info:', err);
      setError(err.message || 'Failed to fetch token information');
    } finally {
      setLoading(false);
    }
  }, [account, getReadOnlyContracts, isSecondaryMarketEnabled]);

  // Get swap quote
  const getSwapQuote = useCallback(async (
    inputToken: 'USDT' | 'BLOCKS',
    inputAmount: bigint,
    slippagePercent: number = 1
  ): Promise<SwapQuote | null> => {
    if (!isSecondaryMarketEnabled || inputAmount === 0n) return null;

    const contracts = getReadOnlyContracts();
    if (!contracts) return null;

    try {
      let outputAmount: bigint;

      if (inputToken === 'USDT') {
        // For USDT→BLOCKS, prefer AMM market price when liquidity exists; fallback to target price
        const hasLiquidity = marketStats?.hasLiquidity;
        const marketPrice = marketStats?.marketPrice;
        const priceToUse = hasLiquidity && marketPrice && marketPrice > 0n ? marketPrice : marketStats?.targetPrice;
        if (!priceToUse || priceToUse === 0n) {
          throw new Error('Price not available');
        }
        // Convert input amount to 18 decimals if needed, then divide by price (USDT per BLOCKS in 18-dec)
        const inDecimals = inputToken === 'USDT' ? (usdtInfo?.decimals ?? 18) : 18;
        const scaleUp = 18 - inDecimals;
        const amountIn18 = scaleUp > 0 ? inputAmount * (10n ** BigInt(scaleUp)) : inputAmount;
        outputAmount = (amountIn18 * 10n ** 18n) / priceToUse;
      } else {
        // For BLOCKS→USDT, use contract function
        outputAmount = await contracts.secondaryMarket.getSwapQuote(inputAmount);
      }

      // Calculate trading fee (applied to input amount)
      const tradingFee = (inputAmount * BigInt(marketStats?.tradingFee || 100)) / 10000n;

      // Calculate minimum output with slippage
      const slippageBps = BigInt(Math.floor(slippagePercent * 100));
      const minimumOutput = (outputAmount * (10000n - slippageBps)) / 10000n;

      // Calculate exchange rate
      const exchangeRate = inputToken === 'USDT'
        ? Number(outputAmount) / Number(inputAmount)
        : Number(inputAmount) / Number(outputAmount);

      // Calculate price impact (simplified)
      const priceImpact = 0.1; // This would need more complex calculation in real implementation

      return {
        inputAmount,
        outputAmount,
        priceImpact,
        minimumOutput,
        tradingFee,
        exchangeRate
      };
    } catch (err: any) {
      console.error('Error getting swap quote:', err);
      setError(err.message || 'Failed to get swap quote');
      return null;
    }
  }, [getReadOnlyContracts, isSecondaryMarketEnabled, marketStats]);

  // Execute token approval
  const approveToken = useCallback(async (
    tokenType: 'USDT' | 'BLOCKS',
    amount: bigint
  ): Promise<boolean> => {
    const contracts = getWriteContracts();
    if (!contracts || !account) return false;

    try {
      setLoading(true);
      const tokenContract = tokenType === 'USDT' ? contracts.usdtToken : contracts.blocksToken;

      toast.loading('Approving token...', { id: 'token-approval' });

      const tx = await tokenContract.approve(appKitConfig.contracts.secondaryMarket!, amount);
      await tx.wait();

      toast.success('Token approved successfully', { id: 'token-approval' });

      // Refresh token info to update allowance
      await fetchTokenInfo();

      return true;
    } catch (err: any) {
      console.error('Error approving token:', err);
      toast.error(err.message || 'Failed to approve token', { id: 'token-approval' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [getWriteContracts, account, fetchTokenInfo]);

  // Execute swap
  const executeSwap = useCallback(async (
    inputToken: 'USDT' | 'BLOCKS',
    inputAmount: bigint,
    minimumOutput: bigint
  ): Promise<boolean> => {
    const contracts = getWriteContracts();
    if (!contracts || !account) return false;

    try {
      setLoading(true);

      toast.loading('Executing swap...', { id: 'swap-execution' });

      let tx;
      if (inputToken === 'USDT') {
        tx = await contracts.secondaryMarket.swapUSDTForBLOCKS(inputAmount, minimumOutput);
      } else {
        tx = await contracts.secondaryMarket.swapBLOCKSForUSDT(inputAmount, minimumOutput);
      }

      await tx.wait();

      toast.success('Swap completed successfully!', { id: 'swap-execution' });

      // Refresh token info and market stats
      await Promise.all([fetchTokenInfo(), fetchMarketStats()]);

      return true;
    } catch (err: any) {
      console.error('Error executing swap:', err);
      toast.error(err.message || 'Failed to execute swap', { id: 'swap-execution' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [getWriteContracts, account, fetchTokenInfo, fetchMarketStats]);

  // Initialize data on mount and connection changes
  useEffect(() => {
    if (isConnected && isCorrectNetwork && isSecondaryMarketEnabled) {
      fetchMarketStats();
      fetchTokenInfo();
    }
  }, [isConnected, isCorrectNetwork, isSecondaryMarketEnabled, fetchMarketStats, fetchTokenInfo]);

  // Listen for refresh events
  useRefreshListener('refreshSecondaryMarket', () => {
    fetchMarketStats();
    fetchTokenInfo();
  });

  const clearError = useCallback(() => setError(null), []);

  return {
    // State
    loading,
    error,
    marketStats,
    usdtInfo,
    blocksInfo,
    isSecondaryMarketEnabled,

    // Actions
    getSwapQuote,
    approveToken,
    executeSwap,
    fetchMarketStats,
    fetchTokenInfo,
    clearError
  };
}
