import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Wallet, TrendingUp, Clock, ExternalLink, Loader2, Package, DollarSign, AlertCircle, RefreshCw, Info, Users, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWeb3 } from '../providers/Web3Provider';
import { useEnhancedBalances, useVesting, useCorrectedVesting, usePurchaseHistory, useUserPortfolioStats, useCorrectedPortfolioStats } from '../hooks/useContracts';
import { useReferral } from '../hooks/useReferral';
import { appKitConfig, getPancakeSwapUrl } from '../lib/appkit';
import { useRefreshContext } from '../contexts/RefreshContext';
import { formatTokenAmount } from '../lib/contracts';

export function PortfolioPage() {
  const { isConnected, account, isCorrectNetwork, switchToCorrectNetwork } = useWeb3();
  const { formattedBalances, loading: balancesLoading, correctionApplied: balanceCorrectionApplied } = useEnhancedBalances();
  const { vestingInfo, formattedVestingInfo, loading: vestingLoading, claimVested, correctionApplied: vestingCorrectionApplied, originalVestingInfo } = useCorrectedVesting();
  const { purchases, formattedRedemptions, formattedSummary, loading: purchaseLoading, error: purchaseError, refetch: refetchPurchaseHistory } = usePurchaseHistory();
  const { formattedStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useUserPortfolioStats();
  const { referralStats, formattedStats: formattedReferralStats, loading: referralLoading } = useReferral();
  const { formattedCorrectedStats, correctionNotice, loading: correctedStatsLoading } = useCorrectedPortfolioStats();
  const { refreshAll } = useRefreshContext();
  const [claiming, setClaiming] = useState(false);

  const handleClaimVested = async () => {
    if (!isConnected || !isCorrectNetwork) {
      toast.error('Please connect your wallet and switch to BSC Testnet');
      return;
    }

    // Fix: Use BigInt comparison instead of .eq() method
    if (vestingInfo.claimable === 0n) {
      toast.error('No tokens available to claim');
      return;
    }

    setClaiming(true);
    try {
      toast.loading('Submitting claim transaction...', { id: 'claim-tx' });

      const tx = await claimVested();
      if (tx) {
        toast.success('Claim transaction submitted!', { id: 'claim-tx' });

        // Wait for transaction confirmation
        toast.loading('Waiting for confirmation...', { id: 'claim-confirm' });
        await tx.wait();

        toast.success('Tokens claimed successfully!', { id: 'claim-confirm' });

        // Auto-refresh all data after successful claim
        await refreshAll();
      }
    } catch (error: any) {
      console.error('Error claiming tokens:', error);

      // Enhanced error handling for common blockchain errors
      let errorMessage = 'Failed to claim tokens';
      if (error?.code === 'ACTION_REJECTED' || error?.code === 4001) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error?.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error?.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please try again';
      } else if (error?.message?.includes('execution reverted')) {
        errorMessage = 'Transaction failed: ' + (error.reason || 'Contract execution reverted');
      }

      toast.error(errorMessage, { id: 'claim-tx' });
      toast.dismiss('claim-confirm');
    } finally {
      setClaiming(false);
    }
  };

  // Fix: Use appKitConfig instead of undefined config
  const pancakeSwapUrl = getPancakeSwapUrl('swap', appKitConfig.contracts.share, appKitConfig.contracts.usdt);

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600">Please connect your wallet to view your portfolio.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-12 w-12 text-warning-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Wrong Network</h3>
            <p className="text-gray-600 mb-4">Please switch to BSC Testnet to view your portfolio.</p>
            <Button onClick={switchToCorrectNetwork}>
              Switch Network
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = balancesLoading || vestingLoading || (statsLoading || (!formattedStats && purchaseLoading));

  // Use corrected stats if available, fallback to regular stats
  const displayStats = formattedCorrectedStats || formattedStats;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio</h1>
        <p className="text-gray-600">Track your investments and manage your assets</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Account Overview</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Connected Account</p>
              <p className="font-mono text-sm">{account}</p>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Correction Notice */}
      {correctionNotice?.show && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">{correctionNotice.title}</h3>
                <p className="text-sm text-blue-700 mt-1">{correctionNotice.message}</p>
                {formattedCorrectedStats?.correctionApplied && (
                  <div className="mt-2 text-xs text-blue-600">
                    <p>• Corrected {formattedCorrectedStats.correctedPurchases} of {formattedCorrectedStats.totalPurchases} purchases</p>
                    <p>• Removed {formattedCorrectedStats.correctionAmount} BLOCKS from inflated data</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investment Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Investment Summary
          </h2>
          {displayStats && (
            <div className="flex items-center space-x-2">
              <Badge variant="success" className="text-xs">
                ⚡ Instant Load
              </Badge>
              {formattedCorrectedStats?.correctionApplied && (
                <Badge variant="outline" className="text-xs">
                  📊 Corrected
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading investment data...</span>
            </div>
          ) : purchaseError ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="h-12 w-12 text-orange-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Data Loading Issue</h3>
              <p className="text-gray-600 text-center mb-4">{purchaseError}</p>
              <Button
                onClick={refetchPurchaseHistory}
                variant="outline"
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Loading
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Use efficient smart contract stats if available, fallback to event-based stats */}
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading portfolio stats...</span>
                </div>
              ) : statsError ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Stats</h3>
                  <p className="text-gray-600 mb-4">
                    Failed to load portfolio statistics. Falling back to transaction history.
                  </p>
                  <Button
                    onClick={refetchStats}
                    variant="outline"
                    className="flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600">Total Invested</p>
                    <p className="text-lg font-semibold text-blue-700">
                      {displayStats ? `${displayStats.totalInvested} USDT` : `${formattedSummary.totalInvested} USDT`}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-green-600">Total Tokens Received</p>
                      {formattedCorrectedStats?.correctionApplied && (
                        <Badge variant="outline" className="text-xs">Corrected</Badge>
                      )}
                    </div>
                    <p className="text-lg font-semibold text-green-700">
                      {displayStats ? displayStats.totalTokensReceived : formattedSummary.totalTokensReceived}
                    </p>
                    {formattedCorrectedStats?.correctionApplied && (
                      <p className="text-xs text-green-600 mt-1">
                        Previously: {formattedCorrectedStats.originalTotalTokens}
                      </p>
                    )}
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600">Packages Purchased</p>
                    <p className="text-lg font-semibold text-purple-700">
                      {displayStats ? displayStats.purchaseCount : formattedSummary.purchaseCount}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-orange-600">BLOCKS-LP Received</p>
                      {formattedCorrectedStats?.correctionApplied && (
                        <Badge variant="outline" className="text-xs">Corrected</Badge>
                      )}
                    </div>
                    <p className="text-lg font-semibold text-orange-700">
                      {displayStats ? displayStats.totalLPTokens : formattedSummary.currentLPTokens}
                    </p>
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              {formattedSummary.purchaseCount > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-indigo-600">Portfolio ROI</p>
                    <p className={`text-lg font-semibold ${formattedSummary.roi >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formattedSummary.roi >= 0 ? '+' : ''}{formattedSummary.roi.toFixed(2)}%
                    </p>
                    <p className="text-xs text-indigo-500 mt-1">Based on tokens received</p>
                  </div>
                  <div className="bg-gradient-to-r from-teal-50 to-green-50 p-4 rounded-lg">
                    <p className="text-sm text-teal-600">Vesting Tokens</p>
                    <p className="text-lg font-semibold text-teal-700">{formattedSummary.totalVestTokens}</p>
                    <p className="text-xs text-teal-500 mt-1">Locked in vesting</p>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-amber-600">Pool Tokens</p>
                    <p className="text-lg font-semibold text-amber-700">{formattedSummary.totalPoolTokens}</p>
                    <p className="text-xs text-amber-500 mt-1">Added to liquidity</p>
                  </div>
                </div>
              )}

              {/* Portfolio Correction Notice */}
              {formattedCorrectedStats?.correctionApplied && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800 mb-2">
                        Portfolio Data Corrections Applied
                      </h3>
                      <div className="text-sm text-blue-700 space-y-2">
                        <p>
                          Your portfolio includes purchases made before our exchange rate fix was deployed.
                          We've automatically corrected the inflated token amounts to show realistic values.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                          <div>
                            <p className="font-medium">Corrections Applied:</p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              <li>Exchange rate inflation fix (historical purchases)</li>
                              <li>Treasury allocation adjustment (portfolio metrics fix)</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium">What This Means:</p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              <li>Token amounts now show realistic values</li>
                              <li>ROI calculations are accurate</li>
                              <li>New purchases use corrected amounts</li>
                            </ul>
                          </div>
                        </div>
                        <p className="text-xs mt-3 pt-2 border-t border-blue-200">
                          <strong>Note:</strong> These corrections only affect the display of historical data.
                          Your actual token holdings and vesting schedules remain unchanged.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Performance */}
      {(formattedReferralStats?.referralCount > 0 || !referralLoading) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <h2 className="text-xl font-semibold">Referral Performance</h2>
              </div>
              {formattedReferralStats?.referralCount > 0 && (
                <Badge variant="success" className="flex items-center">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Active Referrer
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {referralLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-100 p-4 rounded-lg">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : formattedReferralStats?.referralCount > 0 ? (
              <div className="space-y-4">
                {/* Referral Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600">Total Rewards</p>
                        <p className="text-lg font-semibold text-purple-700">
                          {formattedReferralStats.totalRewards} BLOCKS
                        </p>
                      </div>
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Total Referrals</p>
                        <p className="text-lg font-semibold text-blue-700">
                          {formattedReferralStats.referralCount}
                        </p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">Average Reward</p>
                        <p className="text-lg font-semibold text-green-700">
                          {formattedReferralStats.averageReward} BLOCKS
                        </p>
                      </div>
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => window.location.href = '/referral'}
                    className="flex items-center justify-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    View Referral Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const { copyToClipboardWithFeedback } = await import('../lib/referral');
                      const referralUrl = `${window.location.origin}/?ref=${account}`;
                      await copyToClipboardWithFeedback(
                        referralUrl,
                        'Referral link copied to clipboard!',
                        'Failed to copy referral link'
                      );
                    }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Referral Link
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start Earning Referral Rewards</h3>
                <p className="text-gray-600 mb-4">
                  Share your referral link and earn BLOCKS rewards when others join BlockCoop!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => window.location.href = '/referral'}
                    className="flex items-center justify-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Get Your Referral Link
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Purchased Packages */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Purchased Packages
          </h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading purchase history...</span>
            </div>
          ) : purchaseError && purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="h-12 w-12 text-orange-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Purchase History</h3>
              <p className="text-gray-600 text-center mb-4">
                There was an issue loading your purchase history. This might be due to network congestion.
              </p>
              <Button
                onClick={refetchPurchaseHistory}
                variant="outline"
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Packages Purchased</h3>
              <p className="text-gray-600">You haven't purchased any investment packages yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.map((purchase, index) => (
                <div key={`${purchase.transactionHash}-${index}`} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{purchase.packageName}</h3>
                        <Badge variant="info">Package #{purchase.packageId}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Investment Amount</p>
                          <p className="font-semibold">{formatTokenAmount(purchase.usdtAmount, 18, 2)} USDT</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Tokens Received</p>
                          <p className="font-semibold">{formatTokenAmount(purchase.totalTokens, 18, 4)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Vesting Tokens</p>
                          <p className="font-semibold">{formatTokenAmount(purchase.vestTokens, 18, 4)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-2">
                        <div>
                          <p className="text-gray-600">Pool Tokens</p>
                          <p className="font-semibold">{formatTokenAmount(purchase.poolTokens, 18, 4)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">BLOCKS-LP</p>
                          <p className="font-semibold">{formatTokenAmount(purchase.lpTokens, 18, 4)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Purchase Date</p>
                          <p className="font-semibold">{new Date(purchase.timestamp * 1000).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <a
                        href={`https://testnet.bscscan.com/tx/${purchase.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View TX
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOCKS-LP Token Redemptions */}
      {formattedRedemptions.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              BLOCKS-LP Token Redemptions
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formattedRedemptions.map((redemption, index) => (
                <div key={`${redemption.transactionHash}-${index}`} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">BLOCKS-LP Redeemed</p>
                          <p className="font-semibold">{redemption.formattedAmount}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Redemption Date</p>
                          <p className="font-semibold">{redemption.date.toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Block Number</p>
                          <p className="font-semibold">#{redemption.blockNumber}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <a
                        href={`https://testnet.bscscan.com/tx/${redemption.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View TX
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token Balances */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Token Balances</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading balances...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">USDT Balance</p>
                <p className="text-lg font-semibold">{formattedBalances.usdt}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">BLOCKS Tokens</p>
                  {balanceCorrectionApplied && (
                    <Badge variant="outline" className="text-xs">Corrected</Badge>
                  )}
                </div>
                <p className="text-lg font-semibold">{formattedBalances.shareTotal}</p>
                <p className="text-xs text-gray-500">Total received (matches BLOCKS-LP)</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">BLOCKS-LP</p>
                  {formattedCorrectedStats?.correctionApplied && (
                    <Badge variant="outline" className="text-xs">Corrected</Badge>
                  )}
                </div>
                <p className="text-lg font-semibold">
                  {formattedCorrectedStats?.totalLPTokens || formattedBalances.lp}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">BNB Balance</p>
                <p className="text-lg font-semibold">{formattedBalances.native}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Vesting Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Vesting Schedule
            </h2>
            {vestingCorrectionApplied && (
              <Badge variant="outline" className="text-xs">Corrected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading vesting info...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Vesting Progress */}
              {formattedVestingInfo.totalVested !== "0.0000" && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Vesting Progress</h3>
                    <span className="text-sm font-medium text-gray-600">
                      {(formattedVestingInfo.vestingProgress || 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(formattedVestingInfo.vestingProgress || 0, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      {formattedVestingInfo.isCliffPassed ?
                        (formattedVestingInfo.isFullyVested ? "Fully Vested" : "Vesting Active") :
                        "Cliff Period"
                      }
                    </span>
                    {formattedVestingInfo.vestingEndDate && (
                      <span>
                        Ends: {formattedVestingInfo.vestingEndDate.toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Vesting Amounts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Total Vested</p>
                    {vestingCorrectionApplied && (
                      <Badge variant="outline" className="text-xs">Corrected</Badge>
                    )}
                  </div>
                  <p className="text-lg font-semibold">{formattedVestingInfo.totalVested}</p>
                  {vestingCorrectionApplied && originalVestingInfo && (
                    <p className="text-xs text-gray-500 mt-1">
                      Previously: {formatTokenAmount(originalVestingInfo.totalVested, 18, 4)}
                    </p>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Already Claimed</p>
                  <p className="text-lg font-semibold">{formattedVestingInfo.claimed}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">Available to Claim</p>
                  <p className="text-lg font-semibold text-green-700">{formattedVestingInfo.claimable}</p>
                </div>
              </div>

              {/* Vesting Schedule Details */}
              {formattedVestingInfo.totalVested !== "0.0000" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Schedule Details</h4>
                    <div className="space-y-1 text-sm">
                      {formattedVestingInfo.startDate && (
                        <div className="flex justify-between">
                          <span className="text-blue-600">Start Date:</span>
                          <span className="font-medium">{formattedVestingInfo.startDate.toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-blue-600">Cliff Period:</span>
                        <span className="font-medium">{(formattedVestingInfo.cliffDuration || 0).toFixed(0)} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Total Duration:</span>
                        <span className="font-medium">{(formattedVestingInfo.totalDuration || 0).toFixed(0)} days</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2">Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${formattedVestingInfo.isCliffPassed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <span className="text-sm">
                          Cliff {formattedVestingInfo.isCliffPassed ? 'Passed' : 'Active'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${formattedVestingInfo.isFullyVested ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                        <span className="text-sm">
                          {formattedVestingInfo.isFullyVested ? 'Fully Vested' : 'Vesting in Progress'}
                        </span>
                      </div>
                      {formattedVestingInfo.cliffEndDate && !formattedVestingInfo.isCliffPassed && (
                        <div className="text-xs text-purple-600 mt-2">
                          Cliff ends: {formattedVestingInfo.cliffEndDate.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Claim Button */}
              {vestingInfo.claimable > 0n && (
                <div className="pt-4">
                  <Button
                    onClick={handleClaimVested}
                    disabled={claiming || isLoading || !isConnected || !isCorrectNetwork}
                    className="w-full md:w-auto"
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Claiming...
                      </>
                    ) : (
                      'Claim Vested Tokens'
                    )}
                  </Button>
                </div>
              )}

              {/* No Vesting Message */}
              {formattedVestingInfo.totalVested === "0.0000" && (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Vesting Schedule</h3>
                  <p className="text-gray-600">You don't have any tokens in vesting yet. Purchase a package to start earning vested tokens.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trading Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Trading</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">Trade your BLOCKS tokens on PancakeSwap</p>
            <a
              href={pancakeSwapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Trade on PancakeSwap
            </a>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}