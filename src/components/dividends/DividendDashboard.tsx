import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Gift,
  RefreshCw,
  Download,
  Eye,
  AlertCircle,
  Info,
  Coins
} from 'lucide-react';
import { useWeb3 } from '../../providers/Web3Provider';
import { formatTokenAmount } from '../../lib/contracts';
import { ethers } from 'ethers';

interface DividendRecord {
  id: string;
  amount: bigint;
  timestamp: number;
  txHash: string;
  status: 'pending' | 'completed' | 'failed';
  token: 'USDT' | 'BLOCKS';
}

interface DividendStats {
  totalEarned: bigint;
  pendingAmount: bigint;
  lastDistribution: number;
  nextDistribution: number;
  totalDistributions: number;
  averageDistribution: bigint;
}

export function DividendDashboard() {
  const { isConnected, account, isCorrectNetwork } = useWeb3();
  const [dividendStats, setDividendStats] = useState<DividendStats | null>(null);
  const [dividendHistory, setDividendHistory] = useState<DividendRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data for demonstration (in real implementation, this would come from the blockchain)
  useEffect(() => {
    if (isConnected && account) {
      // Simulate loading dividend data
      setDividendStats({
        totalEarned: BigInt('125000000000000000000'), // 125 USDT
        pendingAmount: BigInt('15000000000000000000'), // 15 USDT
        lastDistribution: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        nextDistribution: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
        totalDistributions: 12,
        averageDistribution: BigInt('10416666666666666666') // ~10.42 USDT
      });

      // Simulate dividend history
      setDividendHistory([
        {
          id: '1',
          amount: BigInt('12500000000000000000'), // 12.5 USDT
          timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
          txHash: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'completed',
          token: 'USDT'
        },
        {
          id: '2',
          amount: BigInt('11800000000000000000'), // 11.8 USDT
          timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000,
          txHash: '0x2345678901bcdef12345678901bcdef123456789',
          status: 'completed',
          token: 'USDT'
        },
        {
          id: '3',
          amount: BigInt('13200000000000000000'), // 13.2 USDT
          timestamp: Date.now() - 21 * 24 * 60 * 60 * 1000,
          txHash: '0x3456789012cdef123456789012cdef1234567890',
          status: 'completed',
          token: 'USDT'
        }
      ]);
    }
  }, [isConnected, account]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // In real implementation, this would fetch fresh data from the blockchain
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    } catch (error) {
      console.error('Error refreshing dividend data:', error);
      setError('Failed to refresh dividend data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleClaimDividends = async () => {
    if (!dividendStats?.pendingAmount || dividendStats.pendingAmount === 0n) return;

    setLoading(true);
    try {
      // In real implementation, this would call the dividend contract
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate transaction
      
      // Update stats after claiming
      setDividendStats(prev => prev ? {
        ...prev,
        totalEarned: prev.totalEarned + prev.pendingAmount,
        pendingAmount: 0n
      } : null);
    } catch (error) {
      console.error('Error claiming dividends:', error);
      setError('Failed to claim dividends');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: DividendRecord['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // Show connection prompt if not connected
  if (!isConnected || !account) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4">
            <Gift className="h-8 w-8 text-blue-600 mx-auto mt-2" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600 mb-4">
            Connect your wallet to view your dividend earnings and history
          </p>
          <w3m-button />
        </CardContent>
      </Card>
    );
  }

  // Show network prompt if on wrong network
  if (!isCorrectNetwork) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please switch to BSC Testnet to access dividend features
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dividend Dashboard</h2>
          <p className="text-gray-600">Track your dividend earnings and claim rewards</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              ×
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Dividend Stats */}
      {dividendStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Earned</p>
                  <p className="text-lg font-semibold text-green-600">
                    ${formatTokenAmount(dividendStats.totalEarned, 18, 2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Gift className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-lg font-semibold text-blue-600">
                    ${formatTokenAmount(dividendStats.pendingAmount, 18, 2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average</p>
                  <p className="text-lg font-semibold text-purple-600">
                    ${formatTokenAmount(dividendStats.averageDistribution, 18, 2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Next Distribution</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {formatDate(dividendStats.nextDistribution)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Claim Dividends */}
      {dividendStats && dividendStats.pendingAmount > 0n && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Gift className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Claim Your Dividends
                  </h3>
                  <p className="text-gray-600">
                    You have ${formatTokenAmount(dividendStats.pendingAmount, 18, 2)} USDT ready to claim
                  </p>
                </div>
              </div>
              <Button
                onClick={handleClaimDividends}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {loading ? 'Claiming...' : 'Claim Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dividend History */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Dividend History</h3>
        </CardHeader>
        <CardContent>
          {dividendHistory.length > 0 ? (
            <div className="space-y-4">
              {dividendHistory.map((dividend) => (
                <div
                  key={dividend.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Coins className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        ${formatTokenAmount(dividend.amount, 18, 2)} {dividend.token}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(dividend.timestamp)} at {formatTime(dividend.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(dividend.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://testnet.bscscan.com/tx/${dividend.txHash}`, '_blank')}
                      className="p-2"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No dividend history yet</p>
              <p className="text-sm text-gray-500">
                Dividends will appear here once distributions begin
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardContent className="p-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">How Dividends Work:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Dividends are distributed weekly to BLOCKS token holders</li>
                  <li>• Your share is proportional to your BLOCKS token holdings</li>
                  <li>• Claimed dividends are automatically sent to your wallet</li>
                  <li>• All transactions are recorded on the blockchain for transparency</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
