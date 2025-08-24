import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Lock, 
  Unlock, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Info,
  Loader2,
  Plus,
  Minus,
  Zap,
  Gift,
  Timer
} from 'lucide-react';
import { useWeb3 } from '../../providers/Web3Provider';
import { useEnhancedBalances } from '../../hooks/useContracts';
import { useStaking } from '../../hooks/useStaking';
import { formatTokenAmount } from '../../lib/contracts';
import { formatBLOCKS } from '../../lib/utils';
import toast from 'react-hot-toast';

// Pool display configuration
const POOL_DISPLAY_CONFIG = [
  {
    id: 0,
    name: 'Flexible Staking',
    description: 'No lock period, withdraw anytime',
    icon: Unlock,
    color: 'bg-green-100 text-green-600',
    badgeColor: 'bg-green-500'
  },
  {
    id: 1,
    name: '30-Day Lock',
    description: 'Higher rewards with 30-day commitment',
    icon: Clock,
    color: 'bg-blue-100 text-blue-600',
    badgeColor: 'bg-blue-500'
  },
  {
    id: 2,
    name: '90-Day Lock',
    description: 'Better rewards with 90-day commitment',
    icon: Timer,
    color: 'bg-purple-100 text-purple-600',
    badgeColor: 'bg-purple-500'
  },
  {
    id: 3,
    name: '1-Year Lock',
    description: 'Maximum rewards with 1-year commitment',
    icon: Lock,
    color: 'bg-orange-100 text-orange-600',
    badgeColor: 'bg-orange-500'
  }
];

export function StakingWidget() {
  const { isConnected, account, isCorrectNetwork } = useWeb3();
  const { balances, formattedBalances, loading: balanceLoading } = useEnhancedBalances();
  const {
    pools,
    userStakes,
    stats,
    loading: stakingLoading,
    error: stakingError,
    isStakingEnabled,
    stake,
    unstake,
    claimRewards,
    emergencyUnstake
  } = useStaking();

  const [selectedPoolId, setSelectedPoolId] = useState<number>(0);
  const [stakeAmount, setStakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Environment variables test
  console.log('🔧 Environment Variables Test:', {
    VITE_STAKING_ADDRESS: import.meta.env.VITE_STAKING_ADDRESS,
    VITE_STAKING_ENABLED: import.meta.env.VITE_STAKING_ENABLED,
    VITE_SHARE_ADDRESS: import.meta.env.VITE_SHARE_ADDRESS,
    allViteVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
  });

  // Get display pools with configuration
  const displayPools = pools.map(pool => ({
    ...pool,
    ...POOL_DISPLAY_CONFIG.find(config => config.id === pool.id)
  }));

  // Get selected pool
  const selectedPool = displayPools.find(pool => pool.id === selectedPoolId);

  // Calculate total pending rewards
  const totalPendingRewards = userStakes.reduce((total, stake) => total + stake.pendingRewards, 0n);

  // Handle stake submission
  const handleStake = async () => {
    if (!selectedPool || !stakeAmount) {
      toast.error('Please select a pool and enter an amount');
      return;
    }

    try {
      const amount = BigInt(parseFloat(stakeAmount) * 1e18);
      
      if (amount < selectedPool.minStake) {
        toast.error(`Minimum stake is ${formatBLOCKS(selectedPool.minStake)} BLOCKS`);
        return;
      }

      if (amount > balances.share) {
        toast.error('Insufficient BLOCKS balance');
        return;
      }

      setIsStaking(true);
      await stake(selectedPool.id, amount);
      setStakeAmount('');
    } catch (error) {
      console.error('Staking error:', error);
    } finally {
      setIsStaking(false);
    }
  };

  // Handle unstake
  const handleUnstake = async (poolId: number, amount: bigint) => {
    try {
      setIsUnstaking(true);
      await unstake(poolId, amount);
    } catch (error) {
      console.error('Unstaking error:', error);
    } finally {
      setIsUnstaking(false);
    }
  };

  // Handle claim rewards
  const handleClaimRewards = async (poolId: number) => {
    try {
      setIsClaiming(true);
      await claimRewards(poolId);
    } catch (error) {
      console.error('Claim rewards error:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  // Show loading state
  if (stakingLoading || balanceLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading staking data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (stakingError) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>
              Error loading staking data: {stakingError}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show disabled state
  if (!isStakingEnabled) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Staking is currently not available. Please check back later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show connection required state
  if (!isConnected || !isCorrectNetwork) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet and switch to BSC Testnet to access staking features.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Staking Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">BLOCKS Token Staking</h3>
              <p className="text-sm text-gray-600">Earn rewards by staking your BLOCKS tokens</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Balance Display */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Your Balance</h4>
              
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Available Balance</p>
                    <p className="text-xl font-bold text-purple-900">
                      {balanceLoading ? '...' : formatBLOCKS(balances.share)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Staking Stats */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Your Staking</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Staked:</span>
                  <span className="text-sm font-medium">
                    {stats ? formatBLOCKS(stats.userTotalStaked) : '0'} BLOCKS
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending Rewards:</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatBLOCKS(totalPendingRewards)} BLOCKS
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active Stakes:</span>
                  <span className="text-sm font-medium">{userStakes.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Claim Rewards Button */}
          {totalPendingRewards > BigInt(0) && (
            <div className="flex justify-center">
              <Button
                onClick={() => handleClaimRewards(0)}
                disabled={isClaiming}
                className="mt-4"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    Claim All Rewards ({formatBLOCKS(totalPendingRewards)} BLOCKS)
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staking Pools */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Available Staking Pools</h3>
          <p className="text-sm text-gray-600">Choose a pool that fits your investment strategy</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {displayPools.map((pool) => {
              const Icon = pool.icon || Lock;
              const isSelected = selectedPoolId === pool.id;
              
              return (
                <div
                  key={pool.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPoolId(pool.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${pool.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">{pool.name}</h4>
                        <p className="text-xs text-gray-600">{pool.description}</p>
                      </div>
                    </div>
                    <Badge className={`${pool.badgeColor} text-white`}>
                      {(pool.apyBasisPoints / 100).toFixed(1)}% APY
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Min Stake:</span>
                      <span>{formatBLOCKS(pool.minStake)} BLOCKS</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lock Period:</span>
                      <span>{pool.lockPeriod === 0 ? 'Flexible' : `${Math.floor(pool.lockPeriod / 86400)} days`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Staked:</span>
                      <span>{formatBLOCKS(pool.totalStaked)} BLOCKS</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stake Form */}
          {selectedPool && (
            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">Stake in {selectedPool.name}</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Amount to Stake
                  </label>
                  <button
                    onClick={() => setStakeAmount(formatTokenAmount(balances.share, 18, 6))}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Max: {formatBLOCKS(balances.share)}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="pr-16"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-sm text-gray-500">BLOCKS</span>
                  </div>
                </div>
                
                <Button
                  onClick={handleStake}
                  disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0}
                  className="w-full"
                >
                  {isStaking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Staking...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Stake BLOCKS
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
