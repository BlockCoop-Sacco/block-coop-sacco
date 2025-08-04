import React, { useState, useEffect } from 'react';
import { formatUnits } from 'ethers';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  TrendingDown, 
  TrendingUp, 
  Info, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  DollarSign,
  Coins,
  Activity,
  RefreshCw
} from 'lucide-react';
import { LiquidityRemovalPreview } from '../../lib/liquidityManager';

interface LiquidityRedemptionPreviewProps {
  preview: LiquidityRemovalPreview | null;
  loading: boolean;
  tokenPrices?: {
    shareTokenPriceInUSDT: number;
    usdtPriceInShareToken: number;
  };
  onRefresh?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
}

export function LiquidityRedemptionPreview({
  preview,
  loading,
  tokenPrices,
  onRefresh,
  autoRefresh = true,
  refreshInterval = 30
}: LiquidityRedemptionPreviewProps) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(refreshInterval);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;

    const interval = setInterval(() => {
      setTimeUntilRefresh(prev => {
        if (prev <= 1) {
          onRefresh();
          setLastUpdated(new Date());
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh, refreshInterval]);

  // Update last updated time when preview changes
  useEffect(() => {
    if (preview) {
      setLastUpdated(new Date());
      setTimeUntilRefresh(refreshInterval);
    }
  }, [preview, refreshInterval]);

  const formatTokenAmount = (amount: bigint, decimals: number = 18): string => {
    return parseFloat(formatUnits(amount, decimals)).toFixed(6);
  };

  const formatUSDTAmount = (amount: bigint): string => {
    // Use consistent 18 decimals for V2 architecture
    return parseFloat(formatUnits(amount, 18)).toFixed(2);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const getPriceImpactColor = (impact: number): string => {
    if (impact < 0.1) return 'text-green-600';
    if (impact < 1) return 'text-yellow-600';
    if (impact < 3) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPriceImpactIcon = (impact: number) => {
    if (impact < 0.1) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (impact < 3) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const calculateTotalValue = (): number => {
    if (!preview || !tokenPrices) return 0;
    
    const usdtValue = Number(formatUSDTAmount(preview.expectedUSDT));
    const shareTokenValue = Number(formatTokenAmount(preview.expectedShareToken)) * tokenPrices.shareTokenPriceInUSDT;
    
    return usdtValue + shareTokenValue;
  };

  const calculateSlippageLoss = (): number => {
    if (!preview) return 0;
    
    const expectedUSDT = Number(formatUSDTAmount(preview.expectedUSDT));
    const minimumUSDT = Number(formatUSDTAmount(preview.minimumUSDT));
    const expectedShare = Number(formatTokenAmount(preview.expectedShareToken));
    const minimumShare = Number(formatTokenAmount(preview.minimumShareToken));
    
    const usdtLoss = expectedUSDT - minimumUSDT;
    const shareLoss = expectedShare - minimumShare;
    
    return usdtLoss + (shareLoss * (tokenPrices?.shareTokenPriceInUSDT || 1));
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Calculating preview...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Enter an LP token amount to see preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalValue = calculateTotalValue();
  const slippageLoss = calculateSlippageLoss();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <span className="font-medium">Redemption Preview</span>
          </div>
          <div className="flex items-center space-x-2">
            {autoRefresh && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {timeUntilRefresh}s
              </Badge>
            )}
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Expected Returns */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span>Expected Returns</span>
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">USDT</span>
              </div>
              <div className="text-lg font-bold text-green-900">
                ${formatUSDTAmount(preview.expectedUSDT)}
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Coins className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">BLOCKS</span>
              </div>
              <div className="text-lg font-bold text-blue-900">
                {formatTokenAmount(preview.expectedShareToken)}
              </div>
              {tokenPrices && (
                <div className="text-xs text-blue-700">
                  ≈ ${(Number(formatTokenAmount(preview.expectedShareToken)) * tokenPrices.shareTokenPriceInUSDT).toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {tokenPrices && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Value:</span>
                <span className="font-bold text-gray-900">${totalValue.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Slippage Protection */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-orange-600" />
            <span>Minimum Guaranteed (After Slippage)</span>
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Minimum USDT:</span>
              <span className="font-medium">${formatUSDTAmount(preview.minimumUSDT)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Minimum SHARE:</span>
              <span className="font-medium">{formatTokenAmount(preview.minimumShareToken)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Slippage Tolerance:</span>
              <span className="font-medium">{formatPercentage(preview.slippageTolerance)}</span>
            </div>
            {slippageLoss > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Max Slippage Loss:</span>
                <span className="font-medium text-orange-600">${slippageLoss.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Market Impact */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            {getPriceImpactIcon(preview.priceImpact)}
            <span>Market Impact</span>
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Price Impact:</span>
              <span className={`font-medium ${getPriceImpactColor(preview.priceImpact)}`}>
                {formatPercentage(preview.priceImpact)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">LP Tokens to Redeem:</span>
              <span className="font-medium">{formatTokenAmount(preview.lpTokenAmount)}</span>
            </div>
          </div>

          {/* Price Impact Warning */}
          {preview.priceImpact > 1 && (
            <Alert variant={preview.priceImpact > 3 ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {preview.priceImpact > 3 
                  ? "High price impact! This transaction may significantly affect the token price."
                  : "Moderate price impact detected. Consider splitting into smaller transactions."
                }
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Current Market Prices */}
        {tokenPrices && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 text-sm">Current Market Prices</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="text-gray-600">
                  1 BLOCKS = ${tokenPrices.shareTokenPriceInUSDT.toFixed(4)} USDT
                </div>
                <div className="text-gray-600">
                  1 USDT = {tokenPrices.usdtPriceInShareToken.toFixed(4)} BLOCKS
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
