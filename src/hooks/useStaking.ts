import { useState, useCallback, useEffect } from 'react';
import { useWeb3 } from '../providers/Web3Provider';
import { formatTokenAmount } from '../lib/contracts';
import toast from 'react-hot-toast';

// Staking pool interface
export interface StakingPool {
  id: number;
  name: string;
  lockPeriod: number;
  apyBasisPoints: number;
  minStake: bigint;
  maxStake: bigint;
  totalStaked: bigint;
  isActive: boolean;
  rewardToken: string;
}

// User stake interface
export interface UserStake {
  poolId: number;
  amount: bigint;
  stakedAt: number;
  lockEndTime: number;
  pendingRewards: bigint;
  isLocked: boolean;
}

export interface StakingStats {
  totalRewardPool: bigint;
  totalStakedAcrossAllPools: bigint;
  userTotalStaked: bigint;
  userTotalRewards: bigint;
  userActiveStakes: number;
}

// Hook for staking operations
export function useStaking() {
  const { account, contracts, isConnected } = useWeb3();
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [userStakes, setUserStakes] = useState<UserStake[]>([]);
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if staking is available
  const stakingEnabledEnv = import.meta.env.VITE_STAKING_ENABLED === 'true';
  const hasStakingContract = contracts?.staking !== null && contracts?.staking !== undefined;
  const isStakingEnabled = stakingEnabledEnv && hasStakingContract;

  // Debug logging (can be removed once staking is working)
  console.log('🔍 Staking Debug Info:', {
    stakingEnabledEnv,
    hasStakingContract,
    isStakingEnabled
  });

  // Environment variables test
  console.log('🔧 Environment Variables Test:', {
    VITE_STAKING_ADDRESS: import.meta.env.VITE_STAKING_ADDRESS,
    VITE_STAKING_ENABLED: import.meta.env.VITE_STAKING_ENABLED,
    VITE_SHARE_ADDRESS: import.meta.env.VITE_SHARE_ADDRESS,
    allViteVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
  });

  // Fetch staking pools
  const fetchStakingPools = useCallback(async () => {
    if (!isStakingEnabled || !contracts?.staking) {
      console.log('❌ Staking not enabled or contract not available');
      return;
    }

    try {
      // Clear any previous errors
      setError(null);
      const stakingContract = contracts.staking;
      const poolCount = await stakingContract.poolCount();
      const poolsData: StakingPool[] = [];

      console.log(`📊 Fetching ${poolCount.toString()} staking pools...`);

      for (let i = 0; i < Number(poolCount); i++) {
        const pool = await stakingContract.stakingPools(i);
        
        poolsData.push({
          id: i,
          name: pool.name,
          lockPeriod: Number(pool.lockPeriod),
          apyBasisPoints: Number(pool.apyBasisPoints),
          minStake: pool.minStake,
          maxStake: pool.maxStake,
          totalStaked: pool.totalStaked,
          isActive: pool.isActive,
          rewardToken: pool.rewardToken
        });
      }

      setPools(poolsData);
      console.log('✅ Successfully fetched staking pools:', poolsData.length);
    } catch (err) {
      console.error('Error fetching staking pools:', err);
      setError('Failed to fetch staking pools');
    }
  }, [isStakingEnabled, contracts?.staking]);

  // Fetch user stakes
  const fetchUserStakes = useCallback(async () => {
    if (!account || !isConnected || !contracts?.staking) {
      setUserStakes([]);
      return;
    }

    try {
      // Clear any previous errors
      setError(null);
      const stakingContract = contracts.staking;
      const poolCount = await stakingContract.poolCount();
      const stakesData: UserStake[] = [];

      for (let i = 0; i < Number(poolCount); i++) {
        const userStake = await stakingContract.userStakes(i, account);
        const [amount, stakedAt, lockEndTime, userRewardPerTokenPaid, rewards, isActive] = userStake;
        
        if (amount > 0n && isActive) {
          const currentTime = Math.floor(Date.now() / 1000);
          const isLocked = Number(lockEndTime) > currentTime;

          stakesData.push({
            poolId: i,
            amount,
            stakedAt: Number(stakedAt),
            lockEndTime: Number(lockEndTime),
            pendingRewards: rewards, // Use the rewards field from the UserStake struct
            isLocked
          });
        }
      }

      setUserStakes(stakesData);
      console.log('✅ Successfully fetched user stakes:', stakesData.length);
    } catch (err) {
      console.error('Error fetching user stakes:', err);
      setError('Failed to fetch user stakes');
    }
  }, [account, isConnected, contracts?.staking]);

  // Fetch staking stats
  const fetchStakingStats = useCallback(async () => {
    if (!account || !isConnected || !contracts?.staking) {
      setStats(null);
      return;
    }

    try {
      // Clear any previous errors
      setError(null);
      const stakingContract = contracts.staking;
      const totalRewardsDistributed = await stakingContract.totalRewardsDistributed();
      const userTotalStaked = await stakingContract.totalUserStaked(account);
      const userTotalRewards = await stakingContract.getTotalPendingRewards(account);

      // Get global total staked across all pools
      const totalStakedAcrossAllPools = await stakingContract.totalStaked();

      setStats({
        totalRewardPool: totalRewardsDistributed,
        totalStakedAcrossAllPools,
        userTotalStaked,
        userTotalRewards,
        userActiveStakes: userStakes.length
      });

      console.log('✅ Successfully fetched staking stats:', {
        totalRewardsDistributed: totalRewardsDistributed.toString(),
        totalStakedAcrossAllPools: totalStakedAcrossAllPools.toString(),
        userTotalStaked: userTotalStaked.toString(),
        userTotalRewards: userTotalRewards.toString(),
        userActiveStakes: userStakes.length
      });
    } catch (err) {
      console.error('Error fetching staking stats:', err);
      setError('Failed to fetch staking stats');
    }
  }, [account, isConnected, contracts?.staking, userStakes.length]);

  // Stake tokens
  const stake = useCallback(async (poolId: number, amount: bigint) => {
    if (!account || !isConnected || !contracts?.staking || !contracts?.shareToken) {
      throw new Error('Wallet not connected or contracts not available');
    }

    try {
      const stakingContract = contracts.staking;
      const shareTokenContract = contracts.shareToken;

      // Check allowance
      const allowance = await shareTokenContract.allowance(account, stakingContract.target);
      if (allowance < amount) {
        console.log('Approving BLOCKS tokens for staking...');
        const approveTx = await shareTokenContract.approve(stakingContract.target, amount);
        await approveTx.wait();
        toast.success('BLOCKS tokens approved for staking');
      }

      // Execute stake
      console.log('Executing stake transaction...');
      const stakeTx = await stakingContract.stake(poolId, amount);
      await stakeTx.wait();

      toast.success(`Successfully staked ${formatTokenAmount(amount, 18, 4)} BLOCKS`);
      
      // Refresh data
      await Promise.all([fetchUserStakes(), fetchStakingStats(), fetchStakingPools()]);
    } catch (error: any) {
      console.error('Staking error:', error);
      toast.error(error.message || 'Failed to stake tokens');
      throw error;
    }
  }, [account, isConnected, contracts, fetchUserStakes, fetchStakingStats, fetchStakingPools]);

  // Unstake tokens
  const unstake = useCallback(async (poolId: number, amount: bigint) => {
    if (!account || !isConnected || !contracts?.staking) {
      throw new Error('Wallet not connected or staking contract not available');
    }

    try {
      const stakingContract = contracts.staking;
      
      console.log('Executing unstake transaction...');
      const unstakeTx = await stakingContract.unstake(poolId, amount);
      await unstakeTx.wait();

      toast.success(`Successfully unstaked ${formatTokenAmount(amount, 18, 4)} BLOCKS`);
      
      // Refresh data
      await Promise.all([fetchUserStakes(), fetchStakingStats(), fetchStakingPools()]);
    } catch (error: any) {
      console.error('Unstaking error:', error);
      toast.error(error.message || 'Failed to unstake tokens');
      throw error;
    }
  }, [account, isConnected, contracts, fetchUserStakes, fetchStakingStats, fetchStakingPools]);

  // Claim rewards
  const claimRewards = useCallback(async (poolId: number) => {
    if (!account || !isConnected || !contracts?.staking) {
      throw new Error('Wallet not connected or staking contract not available');
    }

    try {
      const stakingContract = contracts.staking;
      
      console.log('Executing claim rewards transaction...');
      const claimTx = await stakingContract.claimRewards(poolId);
      await claimTx.wait();

      toast.success('Successfully claimed rewards');
      
      // Refresh data
      await Promise.all([fetchUserStakes(), fetchStakingStats()]);
    } catch (error: any) {
      console.error('Claim rewards error:', error);
      toast.error(error.message || 'Failed to claim rewards');
      throw error;
    }
  }, [account, isConnected, contracts, fetchUserStakes, fetchStakingStats]);

  // Emergency unstake
  const emergencyUnstake = useCallback(async (poolId: number) => {
    if (!account || !isConnected || !contracts?.staking) {
      throw new Error('Wallet not connected or staking contract not available');
    }

    try {
      const stakingContract = contracts.staking;
      
      console.log('Executing emergency unstake transaction...');
      const emergencyTx = await stakingContract.emergencyUnstake(poolId);
      await emergencyTx.wait();

      toast.success('Successfully executed emergency unstake');
      
      // Refresh data
      await Promise.all([fetchUserStakes(), fetchStakingStats(), fetchStakingPools()]);
    } catch (error: any) {
      console.error('Emergency unstake error:', error);
      toast.error(error.message || 'Failed to execute emergency unstake');
      throw error;
    }
  }, [account, isConnected, contracts, fetchUserStakes, fetchStakingStats, fetchStakingPools]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (isStakingEnabled) {
      setLoading(true);
      fetchStakingPools().finally(() => setLoading(false));
    }
  }, [isStakingEnabled, fetchStakingPools]);

  useEffect(() => {
    if (isStakingEnabled && account && isConnected) {
      setLoading(true);
      Promise.all([fetchUserStakes(), fetchStakingStats()])
        .finally(() => setLoading(false));
    }
  }, [isStakingEnabled, account, isConnected, fetchUserStakes, fetchStakingStats]);

  return {
    // Data
    pools,
    userStakes,
    stats,
    
    // State
    loading,
    error,
    isStakingEnabled,
    
    // Actions
    stake,
    unstake,
    claimRewards,
    emergencyUnstake,
    
    // Refresh functions
    refreshPools: fetchStakingPools,
    refreshUserStakes: fetchUserStakes,
    refreshStats: fetchStakingStats,
  };
}
