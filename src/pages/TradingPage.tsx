import React, { useState } from 'react';
import { StakingWidget } from '../components/staking/StakingWidget';
import { SwapWidget } from '../components/trading/SwapWidget';
import { useWeb3 } from '../providers/Web3Provider';
import { useSecondaryMarketSwap } from '../hooks/useSecondaryMarketSwap';
import { useEnhancedBalances, useCurrentMarketPrice } from '../hooks/useContracts';
import { useLiquidityPoolInfo } from '../hooks/useLiquidityPoolInfo';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/Badge';
import { Wallet, AlertCircle, ArrowUpDown, Lock, TrendingUp, DollarSign, Coins, RefreshCw, BarChart3 } from 'lucide-react';
import { formatTokenAmount } from '../lib/contracts';
import { shouldShowAdminFeatures } from '../lib/adminConfig';

export function TradingPage() {
  const { isConnected, account, isCorrectNetwork, switchToCorrectNetwork } = useWeb3();
  const { formattedBalances, loading: balancesLoading } = useEnhancedBalances();
  const { marketPrice, loading: marketPriceLoading, refetch: refetchMarketPrice } = useCurrentMarketPrice();
  const { marketStats, usdtInfo, blocksInfo, isSecondaryMarketEnabled, loading: marketLoading, error: marketError, fetchMarketStats, fetchTokenInfo, clearError } = useSecondaryMarketSwap();
  const { totalLiquidity, shareTokenReserves, usdtReserves, shareTokenPrice, totalValueLocked, poolShare, loading: poolLoading, error: poolError, refresh: refreshPoolInfo } = useLiquidityPoolInfo();
  const [activeTab, setActiveTab] = useState('trading');

  // Check if current user is admin
  const isAdmin = shouldShowAdminFeatures(account, isConnected);

  // Calculate current exchange rate (USDT per BLOCKS) - use standardized market price
  const currentExchangeRate = marketPrice ? formatTokenAmount(marketPrice, 18, 4) : null;

  // Handle swap completion to refresh data
  const handleSwapComplete = () => {
    fetchMarketStats();
    fetchTokenInfo();
    refreshPoolInfo();
    refetchMarketPrice(); // Explicitly refresh market price
  };

  // Show connection prompt if not connected
  if (!isConnected || !account) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Secondary Market Trading</h1>
          <p className="text-lg text-gray-600">
            Trade BLOCKS tokens and manage liquidity positions
          </p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4">
              <Wallet className="h-8 w-8 text-blue-600 mx-auto mt-2" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 mb-6">
              Connect your wallet to access secondary market trading features
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
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Secondary Market Trading</h1>
          <p className="text-lg text-gray-600">
            Trade BLOCKS tokens and manage liquidity positions
          </p>
        </div>

        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Please switch to BSC Testnet to access trading</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={switchToCorrectNetwork}
              className="ml-4"
            >
              Switch Network
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Trading & Staking Hub</h1>
        <p className="text-lg text-gray-600">
          Trade BLOCKS tokens on the secondary market and earn rewards through staking
        </p>
      </div>

      {/* Balance Overview */}
      {isConnected && isCorrectNetwork && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">USDT Balance</p>
                  <p className="text-lg font-semibold text-green-600">
                    {usdtInfo ? formatTokenAmount(usdtInfo.balance, usdtInfo.decimals, 4) : '0.0000'} USDT
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>





          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ArrowUpDown className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Trading Status</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={isSecondaryMarketEnabled ? 'default' : 'secondary'}>
                      {isSecondaryMarketEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Market Error Alert */}
      {marketError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{marketError}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              ×
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content - Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="trading" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Trading
          </TabsTrigger>
          <TabsTrigger value="staking" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Staking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trading" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Swap Widget */}
            <div className="lg:col-span-1">
              <SwapWidget onSwapComplete={handleSwapComplete} />
            </div>

            {/* Liquidity Pool Information & BLOCKS Balance */}
            <div className="lg:col-span-2 space-y-6">
              {/* BLOCKS Balance Card */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">BLOCKS Balance</h3>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <p className="text-3xl font-bold text-blue-600">
                      {formattedBalances?.shareTotal || '0.0000'}
                    </p>
                    <p className="text-sm text-gray-600">BLOCKS Tokens</p>
                    <p className="text-xs text-gray-500">Total received (matches BLOCKS-LP)</p>
                  </div>
                </CardContent>
              </Card>

              {/* Liquidity Pool Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Liquidity Pool Information</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshPoolInfo}
                      disabled={poolLoading}
                      className="h-8 px-3"
                    >
                      <RefreshCw className={`h-4 w-4 ${poolLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {poolError ? (
                    <div className="text-center text-red-600 text-sm">
                      {poolError}
                    </div>
                  ) : poolLoading ? (
                    <div className="text-center text-gray-600 text-sm">
                      Loading pool data...
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-gray-500 mb-2">Source: AMM pair reserves</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="text-center space-y-2">
                        <p className="text-sm text-gray-600">Total Value Locked</p>
                        <p className="text-xl font-bold text-green-600">
                          ${totalValueLocked}
                        </p>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm text-gray-600">BLOCKS Reserves</p>
                        <p className="text-lg font-bold text-blue-600">
                          {shareTokenReserves}
                        </p>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm text-gray-600">USDT Reserves</p>
                        <p className="text-lg font-bold text-green-600">
                          {usdtReserves}
                        </p>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm text-gray-600">Total Liquidity</p>
                        <p className="text-lg font-bold text-purple-600">
                          {totalLiquidity}
                        </p>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm text-gray-600">BLOCKS Price</p>
                        <p className="text-lg font-bold text-orange-600">
                          {marketPrice ? `$${formatTokenAmount(marketPrice, 18, 4)}` : `$${shareTokenPrice}`}
                        </p>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm text-gray-600">Your Pool Share</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {poolShare}%
                        </p>
                      </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Trading Information */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Trading Information</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="text-center space-y-2">
                      <p className="text-sm text-gray-600">Trading Fee</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {marketStats ? `${(marketStats.tradingFee / 100).toFixed(2)}%` : 'Loading...'}
                      </p>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm text-gray-600">Slippage Tolerance</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {marketStats ? `${(marketStats.slippageTolerance / 100).toFixed(2)}%` : 'Loading...'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </TabsContent>

        <TabsContent value="staking" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            <StakingWidget />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
