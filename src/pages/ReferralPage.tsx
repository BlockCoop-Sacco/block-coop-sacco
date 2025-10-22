import React from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Share2, 
  Gift, 
  Target,
  AlertCircle,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { useWeb3 } from '../providers/Web3Provider';
import { useReferral } from '../hooks/useReferral';
import toast from 'react-hot-toast';
import { claimReferralRewards } from '../lib/contracts';
import { ReferralMetricsCard } from '../components/referral/ReferralMetricsCard';
import { ReferralLinkCard } from '../components/referral/ReferralLinkCard';
import { ReferralHistoryTable } from '../components/referral/ReferralHistoryTable';

export function ReferralPage() {
  const { isConnected, account, isCorrectNetwork, switchToCorrectNetwork } = useWeb3();
  const { 
    referralHistory, 
    referralStats, 
    formattedStats, 
    loading, 
    error, 
    refetch 
  } = useReferral();

  const handleClaimRewards = async () => {
    try {
      if (!account) return;
      const tx = await claimReferralRewards(account);
      if (tx?.pending) {
        toast.loading('Claiming referral rewards...', { id: 'claim-ref' });
        await tx.wait?.().catch(() => {});
        toast.success('Referral rewards claimed!', { id: 'claim-ref' });
      } else {
        // Current system pays instantly; no on-chain claim needed
        toast.success('Referral rewards are paid instantly on each referral.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to claim referral rewards');
    } finally {
      refetch();
    }
  };

  // Show connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Referral Dashboard</h1>
          <p className="text-gray-600">Earn rewards by referring others to BlockCoop</p>
        </div>

        <Card>
          <CardContent className="text-center py-12">
            <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 mb-6">
              Connect your wallet to view your referral dashboard and start earning rewards.
            </p>
            <w3m-button />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show network switch prompt if on wrong network
  if (!isCorrectNetwork) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Referral Dashboard</h1>
          <p className="text-gray-600">Earn rewards by referring others to BlockCoop</p>
        </div>

        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-orange-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Wrong Network</h3>
            <p className="text-gray-600 mb-6">
              Please switch to BSC Mainnet to access your referral dashboard.
            </p>
            <Button onClick={switchToCorrectNetwork}>
              Switch to BSC Mainnet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Referral Dashboard</h1>
        <p className="text-gray-600">Earn BLOCKS rewards by referring others to BlockCoop SACCO</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Account Overview</h2>
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Connected Account</p>
              <p className="font-mono text-sm">{account}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">Connected</Badge>
              {formattedStats && formattedStats.referralCount > 0 && (
                <Badge variant="outline" className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {formattedStats.referralCount} Referrals
                </Badge>
              )}
              <Button onClick={handleClaimRewards} variant="primary" size="sm">
                Claim Referral Rewards
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={refetch}
                className="ml-auto text-red-700 hover:text-red-800"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral Metrics */}
      <ReferralMetricsCard
        totalRewards={referralStats?.totalRewards || 0n}
        referralCount={referralStats?.referralCount || 0}
        averageReward={referralStats?.averageReward || 0n}
        lastReferralDate={referralStats?.lastReferralDate || null}
        topReferralReward={referralStats?.topReferralReward || 0n}
        loading={loading}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Link Card */}
        <ReferralLinkCard
          userAddress={account || ''}
          totalRewards={referralStats?.totalRewards || 0n}
          referralCount={referralStats?.referralCount || 0}
        />

        {/* How Referrals Work */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">How Referrals Work</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Share2 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Share Your Link</h4>
                  <p className="text-sm text-gray-600">
                    Share your unique referral link with friends and family
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">They Join & Invest</h4>
                  <p className="text-sm text-gray-600">
                    When someone uses your link and purchases a package
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Gift className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Earn Rewards</h4>
                  <p className="text-sm text-gray-600">
                    Receive 2.5% - 5% BLOCKS rewards instantly
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-indigo-700 mb-2">Reward Rates</h4>
              <div className="space-y-1 text-sm text-indigo-600">
                <p>• Starter Package: 2.5% reward</p>
                <p>• Growth Package: 5% reward</p>
                <p>• Premium Package: 5% reward</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-700 mb-2">Benefits</h4>
              <div className="space-y-1 text-sm text-green-600">
                <p>• Instant reward payments</p>
                <p>• No referral limits</p>
                <p>• Transparent tracking</p>
                <p>• Help grow the community</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral History */}
      <ReferralHistoryTable
        transactions={referralHistory}
        loading={loading}
        onRefresh={refetch}
      />

      {/* Getting Started Guide */}
      {(!referralStats || referralStats.referralCount === 0) && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">Getting Started</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-blue-800">
                Ready to start earning referral rewards? Follow these simple steps:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-600 text-sm font-bold px-2 py-1 rounded">1</span>
                    <h4 className="font-medium">Copy Your Link</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Use the referral link card above to copy your unique link
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-600 text-sm font-bold px-2 py-1 rounded">2</span>
                    <h4 className="font-medium">Share Everywhere</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Share on social media, with friends, or in crypto communities
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-600 text-sm font-bold px-2 py-1 rounded">3</span>
                    <h4 className="font-medium">Earn Rewards</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Watch your rewards grow as people join using your link
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
