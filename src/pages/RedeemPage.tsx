import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../providers/Web3Provider';
import { getContracts } from '../lib/contracts';
import { formatUSDT, formatBLOCKS, parseEther } from '../lib/utils';
import { useEnhancedBalances, useBalances, useCorrectedPortfolioStats } from '../hooks/useContracts';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ArrowLeftRight, Wallet, TrendingDown, ArrowRight, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { LiquidityRedemptionCard } from '../components/liquidity/LiquidityRedemptionCard';
import { getExchangeRateCorrection } from '../lib/portfolioCorrection';

interface VestingSnapshot {
  vestedAmount: bigint;
  releasedAmount: bigint;
  claimableAmount: bigint;
  timestamp: number;
}

export function RedeemPage() {
  const { account: address, isConnected, isCorrectNetwork, signer } = useWeb3();
  const { balances, formattedBalances, correctionApplied } = useEnhancedBalances();
  const { correctedStats, formattedCorrectedStats } = useCorrectedPortfolioStats();
  const [lpAmount, setLpAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [vestedAmount, setVestedAmount] = useState<bigint>(0n);
  const [releasedAmount, setReleasedAmount] = useState<bigint>(0n);
  const [preRedeemSnapshot, setPreRedeemSnapshot] = useState<VestingSnapshot | null>(null);
  const [postRedeemSnapshot, setPostRedeemSnapshot] = useState<VestingSnapshot | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Helper function to get corrected LP balance for user interactions
  const getCorrectedLPBalance = () => {
    // Use the corrected LP tokens from portfolio stats if available
    const correctedLPTokens = correctedStats?.totalLPTokens || 0n;
    return correctedLPTokens > 0n ? correctedLPTokens : balances.lp;
  };

  // Helper function to get formatted corrected LP balance for display
  const getFormattedCorrectedLPBalance = () => {
    return formattedCorrectedStats?.totalLPTokens || formattedBalances.lp;
  };

  useEffect(() => {
    if (address && isConnected) {
      loadBalances();
    }
  }, [address, isConnected]);

  const loadBalances = async () => {
    if (!address) return;

    try {
      const contracts = getContracts();
      const [vested, released] = await Promise.all([
        contracts.vestingVault.vestedAmount(address),
        contracts.vestingVault.released(address),
      ]);

      setVestedAmount(vested);
      setReleasedAmount(released);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  // Unified refresh function for post-transaction state updates
  const refreshAll = async () => {
    await loadBalances();
  };

  const createVestingSnapshot = (vested: bigint, released: bigint): VestingSnapshot => {
    return {
      vestedAmount: vested,
      releasedAmount: released,
      claimableAmount: vested - released,
      timestamp: Date.now()
    };
  };

  const resetComparison = () => {
    setPreRedeemSnapshot(null);
    setPostRedeemSnapshot(null);
    setShowComparison(false);
  };

  const handleRedeemLP = async () => {
    try {
      setLoading(true);
      // Clear any existing comparison
      resetComparison();

      // Network & Connection Validation
      if (!isConnected || !isCorrectNetwork) {
        toast.error('Connect your wallet and switch to BSC Testnet');
        return;
      }

      if (!signer) {
        toast.error('No signer available');
        return;
      }

      const contracts = getContracts(signer);
      const userInputAmount = parseEther(lpAmount);

      // Convert user input (corrected) back to raw amount for transaction
      const correctedLPTokens = correctedStats?.totalLPTokens || 0n;
      const rawAmount = correctedLPTokens > 0n && balances.lp > 0n
        ? (userInputAmount * balances.lp) / correctedLPTokens
        : userInputAmount;

      // Input Validation with BigInt comparisons
      if (userInputAmount <= 0n) {
        throw new Error('Please enter a valid amount');
      }

      if (rawAmount > balances.lp) {
        throw new Error('Insufficient BLOCKS-LP token balance');
      }

      // Capture pre-redemption vesting state
      const preSnapshot = createVestingSnapshot(vestedAmount, releasedAmount);
      setPreRedeemSnapshot(preSnapshot);

      const tx = await contracts.packageManager.redeem(rawAmount);

      toast.loading('Processing redemption...', { id: 'redeem' });
      await tx.wait();

      // Reload balances and capture post-redemption state
      const [newVested, newReleased] = await Promise.all([
        contracts.vestingVault.vestedAmount(address),
        contracts.vestingVault.released(address),
      ]);

      const postSnapshot = createVestingSnapshot(newVested, newReleased);
      setPostRedeemSnapshot(postSnapshot);

      // Only show comparison if there's a meaningful change
      if (postSnapshot.claimableAmount !== preSnapshot.claimableAmount) {
        setShowComparison(true);
      }

      toast.success('BLOCKS-LP tokens redeemed successfully!', { id: 'redeem' });

      setLpAmount('');
      await refreshAll();
    } catch (error: any) {
      console.error('Redeem error:', error);
      toast.error(error.message || 'Failed to redeem BLOCKS-LP tokens', { id: 'redeem' });
      // Reset comparison state on error
      resetComparison();
    } finally {
      setLoading(false);
    }
  };

  const handleClaimVested = async () => {
    try {
      setLoading(true);

      // Network & Connection Validation
      if (!isConnected || !isCorrectNetwork) {
        toast.error('Connect your wallet and switch to BSC Testnet');
        return;
      }

      if (!signer) {
        toast.error('No signer available');
        return;
      }

      const contracts = getContracts(signer);
      const claimable = vestedAmount - releasedAmount;

      if (claimable <= 0n) {
        throw new Error('No tokens available to claim');
      }

      const tx = await contracts.vestingVault.claim();

      toast.loading('Claiming vested tokens...', { id: 'claim' });
      await tx.wait();
      toast.success('Vested tokens claimed successfully!', { id: 'claim' });

      await refreshAll();
    } catch (error: any) {
      console.error('Claim error:', error);
      toast.error(error.message || 'Failed to claim vested tokens', { id: 'claim' });
    } finally {
      setLoading(false);
    }
  };

  const claimableAmount = vestedAmount - releasedAmount;
  const hasClaimableTokens = claimableAmount > 0n;

  // Vesting comparison component
  const VestingComparison = () => {
    if (!showComparison || !preRedeemSnapshot || !postRedeemSnapshot) return null;

    const claimableChange = postRedeemSnapshot.claimableAmount - preRedeemSnapshot.claimableAmount;
    const hasIncrease = claimableChange > 0n;

    return (
      <Card className="animate-fade-in border-green-200 bg-green-50">
        <CardHeader>
          <h3 className="text-lg font-semibold text-green-800">Redemption Complete - Vesting Status Updated</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Before */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium text-gray-700 mb-3">Before Redemption</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Vested:</span>
                  <span className="font-medium">{formatBLOCKS(preRedeemSnapshot.vestedAmount)} BLOCKS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Released:</span>
                  <span className="font-medium">{formatBLOCKS(preRedeemSnapshot.releasedAmount)} BLOCKS</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-700 font-medium">Claimable:</span>
                  <span className="font-bold">{formatBLOCKS(preRedeemSnapshot.claimableAmount)} BLOCKS</span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <ArrowRight className="h-8 w-8 text-green-600" />
            </div>

            {/* After */}
            <div className="bg-white rounded-lg p-4 border border-green-300">
              <h4 className="font-medium text-green-700 mb-3">After Redemption</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Vested:</span>
                  <span className="font-medium">{formatBLOCKS(postRedeemSnapshot.vestedAmount)} BLOCKS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Released:</span>
                  <span className="font-medium">{formatBLOCKS(postRedeemSnapshot.releasedAmount)} BLOCKS</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-700 font-medium">Claimable:</span>
                  <span className="font-bold text-green-700">{formatBLOCKS(postRedeemSnapshot.claimableAmount)} BLOCKS</span>
                </div>
              </div>
            </div>
          </div>

          {hasIncrease && (
            <div className="bg-green-100 rounded-lg p-3 text-center">
              <p className="text-green-800 font-medium">
                🎉 Your claimable balance increased by {formatBLOCKS(claimableChange)} BLOCKS!
              </p>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={resetComparison}
            >
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Wallet Not Connected</h3>
            <p className="text-gray-600">Please connect your wallet to redeem BLOCKS-LP tokens and claim vested rewards.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Redeem & Claim</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Redeem your BLOCKS-LP tokens for underlying assets or claim your vested BLOCKS tokens.
        </p>
      </div>

      {/* Vesting Comparison - Show at top when available */}
      <VestingComparison />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enhanced Liquidity Redemption - Primary Option */}
        <Card className="animate-fade-in border-purple-200 bg-purple-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Enhanced LP Redemption</h2>
                <p className="text-sm text-gray-600">Remove liquidity directly from PancakeSwap with slippage protection</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-purple-100 rounded-lg">
              <div className="flex items-start space-x-3">
                <Zap className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-900 mb-1">Recommended Redemption Method</h4>
                  <p className="text-sm text-purple-700">
                    This enhanced redemption method actually removes your liquidity from the PancakeSwap pool,
                    returning both USDT and BLOCKS to your wallet with configurable slippage protection
                    and MEV resistance.
                  </p>
                  <div className="mt-2 text-xs text-purple-600">
                    ✓ Real liquidity removal from PancakeSwap<br/>
                    ✓ Slippage protection<br/>
                    ✓ MEV protection<br/>
                    ✓ Real-time price preview
                  </div>
                </div>
              </div>
            </div>

            <LiquidityRedemptionCard onRedemptionComplete={refreshAll} />
          </CardContent>
        </Card>

        {/* Basic BLOCKS-LP Token Redemption - Fallback Option */}
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <ArrowLeftRight className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Basic Redemption</h2>
                <p className="text-sm text-gray-600">Simple exchange via smart contract (fallback method)</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Your LP Balance:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    {getFormattedCorrectedLPBalance()} BLOCKS-LP
                  </span>
                  {formattedCorrectedStats?.correctionApplied && (
                    <Badge variant="secondary" className="text-xs">
                      Corrected
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Amount to Redeem"
                type="number"
                placeholder="0.0"
                value={lpAmount}
                onChange={(e) => setLpAmount(e.target.value)}
              />
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const correctedBalance = getCorrectedLPBalance();
                    setLpAmount(ethers.formatEther(correctedBalance / 4n));
                  }}
                >
                  25%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const correctedBalance = getCorrectedLPBalance();
                    setLpAmount(ethers.formatEther(correctedBalance / 2n));
                  }}
                >
                  50%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const correctedBalance = getCorrectedLPBalance();
                    setLpAmount(ethers.formatEther((correctedBalance * 3n) / 4n));
                  }}
                >
                  75%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const correctedBalance = getCorrectedLPBalance();
                    setLpAmount(ethers.formatEther(correctedBalance));
                  }}
                >
                  Max
                </Button>
              </div>
            </div>

            <Button
              onClick={handleRedeemLP}
              loading={loading}
              disabled={!lpAmount || parseEther(lpAmount) <= 0n || (() => {
                const userInputAmount = parseEther(lpAmount);
                const correctedLPTokens = correctedStats?.totalLPTokens || 0n;
                const rawAmount = correctedLPTokens > 0n && balances.lp > 0n
                  ? (userInputAmount * balances.lp) / correctedLPTokens
                  : userInputAmount;
                return rawAmount > balances.lp;
              })()}
              className="w-full"
              size="lg"
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Redeem BLOCKS-LP Tokens
            </Button>
          </CardContent>
        </Card>

        {/* Vested Token Claiming */}
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent-100 rounded-lg">
                <Wallet className="h-6 w-6 text-accent-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Claim Vested Tokens</h2>
                <p className="text-sm text-gray-600">Claim your unlocked BLOCKS tokens</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Vested:</span>
                  <span className="font-medium">{formatBLOCKS(vestedAmount)} BLOCKS</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Already Released:</span>
                  <span className="font-medium">{formatBLOCKS(releasedAmount)} BLOCKS</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-medium">Available to Claim:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-lg">{formatBLOCKS(claimableAmount)} BLOCKS</span>
                      {hasClaimableTokens && (
                        <Badge variant="success">Ready</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {!hasClaimableTokens && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No tokens ready to claim</div>
                  <div className="text-sm text-gray-500">
                    Tokens will unlock according to your vesting schedule
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleClaimVested}
              loading={loading}
              disabled={!hasClaimableTokens}
              className="w-full"
              size="lg"
            >
              Claim Vested Tokens
            </Button>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}