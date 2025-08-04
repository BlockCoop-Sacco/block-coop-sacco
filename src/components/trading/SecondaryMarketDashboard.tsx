import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Coins,
  BarChart3,
  Activity,
  RefreshCw,
  ArrowUpDown,
  Target,
  Zap,
  Info,
  AlertCircle
} from 'lucide-react';
import { useSecondaryMarketSwap } from '../../hooks/useSecondaryMarketSwap';
import { useWeb3 } from '../../providers/Web3Provider';
import { formatTokenAmount } from '../../lib/contracts';

interface MarketMetrics {
  totalVolume24h: bigint;
  priceChange24h: number;
  totalLiquidity: bigint;
  activeTraders: number;
  averageTradeSize: bigint;
}

export function SecondaryMarketDashboard() {
  const { isConnected, isCorrectNetwork } = useWeb3();
  const {
    marketStats,
    usdtInfo,
    blocksInfo,
    isSecondaryMarketEnabled,
    loading,
    error,
    fetchMarketStats,
    fetchTokenInfo,
    clearError
  } = useSecondaryMarketSwap();

  const [metrics, setMetrics] = useState<MarketMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Mock metrics for demonstration (in real implementation, these would come from the backend)
  useEffect(() => {
    if (isSecondaryMarketEnabled) {
      setMetrics({
        totalVolume24h: BigInt('125000000000000000000'), // 125 USDT
        priceChange24h: 2.5, // +2.5%
        totalLiquidity: BigInt('50000000000000000000000'), // 50,000 USDT
        activeTraders: 47,
        averageTradeSize: BigInt('2500000000000000000') // 2.5 USDT
      });
    }
  }, [isSecondaryMarketEnabled]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchMarketStats(),
        fetchTokenInfo()
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Show unavailable message if SecondaryMarket is not enabled
  if (!isSecondaryMarketEnabled) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Secondary market dashboard is not available. The SecondaryMarket contract needs to be deployed.
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
          <h2 className="text-2xl font-bold text-gray-900">Secondary Market Dashboard</h2>
          <p className="text-gray-600">Real-time market data and trading statistics</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing || loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              ×
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Market Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Target Price</p>
                <p className="text-lg font-semibold text-green-600">
                  {marketStats ? `$${formatTokenAmount(marketStats.targetPrice, 18, 4)}` : 'Loading...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Trading Fee</p>
                <p className="text-lg font-semibold text-blue-600">
                  {marketStats ? `${(marketStats.tradingFee / 100).toFixed(2)}%` : 'Loading...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ArrowUpDown className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Market Status</p>
                <Badge variant={marketStats?.marketMakingEnabled ? 'default' : 'secondary'}>
                  {marketStats?.marketMakingEnabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Slippage Tolerance</p>
                <p className="text-lg font-semibold text-orange-600">
                  {marketStats ? `${(marketStats.slippageTolerance / 100).toFixed(2)}%` : 'Loading...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                24h Volume
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-blue-600">
                  ${formatTokenAmount(metrics.totalVolume24h, 18, 2)}
                </p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">
                    +{metrics.priceChange24h.toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500">vs yesterday</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Total Liquidity
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-green-600">
                  ${formatTokenAmount(metrics.totalLiquidity, 18, 0)}
                </p>
                <p className="text-sm text-gray-500">
                  Available for trading
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Coins className="h-5 w-5 text-purple-600" />
                Active Traders
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-purple-600">
                  {metrics.activeTraders}
                </p>
                <p className="text-sm text-gray-500">
                  Avg trade: ${formatTokenAmount(metrics.averageTradeSize, 18, 2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Token Balances (if connected) */}
      {isConnected && isCorrectNetwork && (usdtInfo || blocksInfo) && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Your Token Balances</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {usdtInfo && (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">USDT Balance</p>
                      <p className="text-sm text-gray-600">Available for trading</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-green-600">
                      {formatTokenAmount(usdtInfo.balance, usdtInfo.decimals, 4)}
                    </p>
                    <p className="text-sm text-gray-500">USDT</p>
                  </div>
                </div>
              )}

              {blocksInfo && (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Coins className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">BLOCKS Balance</p>
                      <p className="text-sm text-gray-600">Available for trading</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-blue-600">
                      {formatTokenAmount(blocksInfo.balance, blocksInfo.decimals, 4)}
                    </p>
                    <p className="text-sm text-gray-500">BLOCKS</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Information */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Market Information</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Trading Parameters</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Target Price:</span>
                  <span className="font-medium">
                    {marketStats ? `$${formatTokenAmount(marketStats.targetPrice, 18, 4)}` : 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trading Fee:</span>
                  <span className="font-medium">
                    {marketStats ? `${(marketStats.tradingFee / 100).toFixed(2)}%` : 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Slippage:</span>
                  <span className="font-medium">
                    {marketStats ? `${(marketStats.slippageTolerance / 100).toFixed(2)}%` : 'Loading...'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Market Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Market Making:</span>
                  <Badge variant={marketStats?.marketMakingEnabled ? 'default' : 'secondary'}>
                    {marketStats?.marketMakingEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Liquidity Pair:</span>
                  <span className="font-mono text-xs">
                    {marketStats?.liquidityPair ? 
                      `${marketStats.liquidityPair.slice(0, 6)}...${marketStats.liquidityPair.slice(-4)}` : 
                      'Loading...'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
