import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Users, DollarSign, TrendingUp, Award, Calendar, Target } from 'lucide-react';
import { formatBLOCKS } from '../../lib/utils';

interface ReferralMetricsCardProps {
  totalRewards: bigint;
  referralCount: number;
  averageReward: bigint;
  lastReferralDate: number | null;
  topReferralReward: bigint;
  loading?: boolean;
}

export function ReferralMetricsCard({
  totalRewards,
  referralCount,
  averageReward,
  lastReferralDate,
  topReferralReward,
  loading = false,
}: ReferralMetricsCardProps) {
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatTimeAgo = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - (timestamp * 1000);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Referral Performance</h3>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-100 p-4 rounded-lg">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Referral Performance</h3>
          {referralCount > 0 && (
            <Badge variant="success" className="flex items-center">
              <Award className="h-3 w-3 mr-1" />
              Active Referrer
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Rewards */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Total Rewards</p>
                <p className="text-lg font-semibold text-green-700">
                  {formatBLOCKS(totalRewards)} BLOCKS
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          {/* Total Referrals */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Referrals</p>
                <p className="text-lg font-semibold text-blue-700">{referralCount}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Average Reward */}
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Average Reward</p>
                <p className="text-lg font-semibold text-purple-700">
                  {referralCount > 0 ? formatBLOCKS(averageReward) : '0'} BLOCKS
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Top Reward */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Highest Reward</p>
                <p className="text-lg font-semibold text-orange-700">
                  {formatBLOCKS(topReferralReward)} BLOCKS
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Last Referral */}
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-teal-600">Last Referral</p>
                <p className="text-lg font-semibold text-teal-700">
                  {formatTimeAgo(lastReferralDate)}
                </p>
                {lastReferralDate && (
                  <p className="text-xs text-teal-500 mt-1">
                    {formatDate(lastReferralDate)}
                  </p>
                )}
              </div>
              <div className="p-2 bg-teal-100 rounded-lg">
                <Calendar className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </div>

          {/* Performance Status */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-semibold text-gray-700">
                  {referralCount === 0 ? 'Getting Started' : 
                   referralCount < 5 ? 'Building Network' :
                   referralCount < 20 ? 'Active Referrer' : 'Top Performer'}
                </p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Award className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        {referralCount > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-indigo-700 mb-2">Performance Insights</h4>
            <div className="space-y-1 text-sm text-indigo-600">
              {referralCount >= 10 && (
                <p>🎉 Great job! You've referred {referralCount} users to BlockCoop.</p>
              )}
              {totalRewards > 0n && (
                <p>💰 You've earned {formatBLOCKS(totalRewards)} BLOCKS in referral rewards.</p>
              )}
              {referralCount < 5 && (
                <p>🚀 Refer more users to increase your rewards and build your network!</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
