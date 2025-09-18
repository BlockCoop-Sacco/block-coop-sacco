import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../providers/Web3Provider';
import { appKitConfig } from '../lib/appkit';

// PancakeSwap ABI for liquidity pool data
const PANCAKE_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function totalSupply() external view returns (uint256)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function kLast() external view returns (uint256)'
];

const PANCAKE_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

export interface LiquidityPoolInfo {
  totalLiquidity: string;
  shareTokenReserves: string;
  usdtReserves: string;
  shareTokenPrice: string;
  totalValueLocked: string;
  poolShare: string;
  loading: boolean;
  error: string | null;
}

export function useLiquidityPoolInfo() {
  const { provider, account, isConnected, isCorrectNetwork } = useWeb3();
  const [poolInfo, setPoolInfo] = useState<LiquidityPoolInfo>({
    totalLiquidity: '0',
    shareTokenReserves: '0',
    usdtReserves: '0',
    shareTokenPrice: '0',
    totalValueLocked: '0',
    poolShare: '0',
    loading: false,
    error: null
  });

  const fetchPoolInfo = useCallback(async () => {
    if (!provider || !isConnected || !isCorrectNetwork) return;

    try {
      setPoolInfo(prev => ({ ...prev, loading: true, error: null }));

      // Create factory contract instance
      const factory = new ethers.Contract(
        appKitConfig.contracts.factory,
        PANCAKE_FACTORY_ABI,
        provider
      );

      // Get pair address
      const pairAddress = await factory.getPair(
        appKitConfig.contracts.share,
        appKitConfig.contracts.usdt
      );

      if (pairAddress === ethers.ZeroAddress) {
        throw new Error('Liquidity pair not found');
      }

      // Create pair contract instance
      const pair = new ethers.Contract(pairAddress, PANCAKE_PAIR_ABI, provider);

      // Get reserves and total supply from PancakeSwap pair
      const [reserves, totalSupply, token0] = await Promise.all([
        pair.getReserves(),
        pair.totalSupply(),
        pair.token0()
      ]);

      // Determine which reserve corresponds to which token
      const shareTokenAddress = appKitConfig.contracts.share;
      const isShareToken0 = token0.toLowerCase() === shareTokenAddress.toLowerCase();
      
      const shareTokenReserves = isShareToken0 ? reserves[0] : reserves[1];
      const usdtReserves = isShareToken0 ? reserves[1] : reserves[0];

      // Calculate total liquidity (LP tokens)
      const totalLiquidity = ethers.formatUnits(totalSupply, 18);

      // Use PancakeSwap pair reserves directly (truth source)
      const finalShareTokenReserves = shareTokenReserves;
      const finalUsdtReserves = usdtReserves;

      // Convert reserves to decimal numbers and compute price (USDT per BLOCKS)
      const usdtReservesDecimal = Number(ethers.formatUnits(finalUsdtReserves, 18));
      const shareTokenReservesDecimal = Number(ethers.formatUnits(finalShareTokenReserves, 18));
      const shareTokenPrice = shareTokenReservesDecimal > 0 ? (usdtReservesDecimal / shareTokenReservesDecimal) : 0;
      
      // TVL = USDT reserves + (BLOCKS reserves * BLOCKS price in USDT)
      const totalValueLocked = usdtReservesDecimal + (shareTokenReservesDecimal * shareTokenPrice);

      // Calculate user's pool share if they have LP tokens
      let poolShare = '0';
      if (account) {
        try {
          const lpToken = new ethers.Contract(
            appKitConfig.contracts.lp,
            ['function balanceOf(address) external view returns (uint256)',
             'function totalSupply() external view returns (uint256)'],
            provider
          );
          
          // Get both user's LP balance and LP token's total supply
          const [userLPBalance, lpTokenTotalSupply] = await Promise.all([
            lpToken.balanceOf(account),
            lpToken.totalSupply()
          ]);
          
          if (userLPBalance > 0n && lpTokenTotalSupply > 0n) {
            const calculatedShare = (Number(userLPBalance) / Number(lpTokenTotalSupply)) * 100;
            // Safety check: pool share should never exceed 100%
            poolShare = Math.min(calculatedShare, 100).toFixed(3);
          }
        } catch (error) {
          console.warn('Could not fetch user LP balance:', error);
        }
      }

      setPoolInfo({
        totalLiquidity: Number(totalLiquidity).toFixed(3),
        shareTokenReserves: Number(ethers.formatUnits(finalShareTokenReserves, 18)).toFixed(3),
        usdtReserves: Number(ethers.formatUnits(finalUsdtReserves, 18)).toFixed(3),
        shareTokenPrice: shareTokenPrice.toFixed(3),
        totalValueLocked: totalValueLocked.toFixed(3),
        poolShare: Number(poolShare).toFixed(3),
        loading: false,
        error: null
      });

    } catch (error: any) {
      console.error('Error fetching liquidity pool info:', error);
      setPoolInfo(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch pool information'
      }));
    }
  }, [provider, isConnected, isCorrectNetwork, account]);

  // Fetch pool info on mount and when dependencies change
  useEffect(() => {
    fetchPoolInfo();
  }, [fetchPoolInfo]);

  // Refresh function for manual updates
  const refresh = useCallback(() => {
    fetchPoolInfo();
  }, [fetchPoolInfo]);

  return {
    ...poolInfo,
    refresh
  };
}
