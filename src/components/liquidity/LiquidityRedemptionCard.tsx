import React, { useState, useEffect } from 'react';
import { parseEther, formatUnits, parseUnits } from 'ethers';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { Badge } from '../ui/Badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  TrendingDown, 
  Settings, 
  Shield, 
  AlertTriangle, 
  Info,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLiquidityRedemption, useSlippageTolerance, useLiquidityFormatting } from '../../hooks/useLiquidityRedemption';
import { useEnhancedBalances, useBalances, useUserPortfolioStats } from '../../hooks/useContracts';
import { useWeb3 } from '../../providers/Web3Provider';
import { SlippageProtectionSettings, SlippageSettings } from './SlippageProtectionSettings';
import { LiquidityRedemptionPreview } from './LiquidityRedemptionPreview';
import { MEVProtectionSettings, MEVProtectionConfig } from './MEVProtectionSettings';

interface LiquidityRedemptionCardProps {
  onRedemptionComplete?: () => void;
}

export function LiquidityRedemptionCard({ onRedemptionComplete }: LiquidityRedemptionCardProps) {
  const { isConnected, isCorrectNetwork } = useWeb3();
  const { balances, formattedBalances, loading: balancesLoading } = useEnhancedBalances();
  const { stats, formattedStats } = useUserPortfolioStats();
  const {
    preview,
    tokenPrices,
    loading,
    error,
    getPreview,
    executeLiquidityRemoval,
    clearPreview,
    clearError,
    updateSlippageConfig,
    updateMEVProtectionFromConfig,
    config,
  } = useLiquidityRedemption();

  const {
    tolerance,
    updateTolerance,
    isHighSlippage,
    isVeryHighSlippage,
  } = useSlippageTolerance();

  const {
    formatTokenAmount,
    formatUSDTAmount,
    formatPercentage,
    formatPriceImpact,
  } = useLiquidityFormatting();

  const [lpAmount, setLpAmount] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [showMEVSettings, setShowMEVSettings] = useState(false);
  const [slippageSettings, setSlippageSettings] = useState<SlippageSettings>({
    tolerance: 0.5,
    deadline: 5,
    autoSlippage: true,
    maxSlippage: 15
  });
  const [mevSettings, setMevSettings] = useState<MEVProtectionConfig>({
    enabled: true,
    maxGasPrice: parseUnits('20', 'gwei'),
    priorityFee: parseUnits('2', 'gwei'),
    deadline: 5,
    usePrivateMempool: false,
    frontrunProtection: true,
    sandwichProtection: true,
    flashloanProtection: true,
  });

  // Update slippage config when settings change
  useEffect(() => {
    updateSlippageConfig({
      tolerance: slippageSettings.tolerance,
      deadline: slippageSettings.deadline * 60, // Convert minutes to seconds
    });
  }, [slippageSettings, updateSlippageConfig]);

  // Update MEV protection config when settings change
  useEffect(() => {
    updateMEVProtectionFromConfig(mevSettings);
  }, [mevSettings, updateMEVProtectionFromConfig]);

  // Auto-preview when amount changes
  useEffect(() => {
    if (lpAmount && parseFloat(lpAmount) > 0) {
      const userInputAmount = parseEther(lpAmount);

      // Use raw input directly for preview
      const rawAmount = userInputAmount;

      if (rawAmount <= balances.lp) {
        getPreview(rawAmount);
      } else {
        clearPreview();
      }
    } else {
      clearPreview();
    }
  }, [lpAmount, balances.lp, getPreview, clearPreview]);

  const handleRedemption = async () => {
    if (!isConnected || !isCorrectNetwork) {
      toast.error('Please connect your wallet and switch to BSC Testnet');
      return;
    }

    if (!lpAmount || parseFloat(lpAmount) <= 0) {
      toast.error('Please enter a valid LP token amount');
      return;
    }

    const userInputAmount = parseEther(lpAmount);

    // Use raw input directly for transaction
    const rawAmount = userInputAmount;

    if (rawAmount > balances.lp) {
      toast.error('Insufficient LP token balance');
      return;
    }

    try {
      toast.loading('Removing liquidity from PancakeSwap...', { id: 'liquidity-removal' });

      const tx = await executeLiquidityRemoval(rawAmount);
      
      toast.loading('Waiting for confirmation...', { id: 'liquidity-removal' });
      await tx.wait();
      
      toast.success('Liquidity removed successfully!', { id: 'liquidity-removal' });
      
      setLpAmount('');
      clearPreview();
      onRedemptionComplete?.();
    } catch (error: any) {
      console.error('Liquidity removal error:', error);
      toast.error(error.message || 'Failed to remove liquidity', { id: 'liquidity-removal' });
    }
  };

  const handleMaxClick = () => {
    if (balances.lp > 0n) {
      setLpAmount(formatUnits(balances.lp, 18));
    }
  };

  const priceImpactFormatted = preview ? formatPriceImpact(preview.priceImpact) : null;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Remove Liquidity</h3>
              <p className="text-sm text-gray-600">Redeem BLOCKS-LP tokens for USDT + BLOCKS</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button variant="ghost" size="sm" onClick={clearError} className="ml-2">
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* LP Token Input */}
        <div className="space-y-2">
          <Label htmlFor="lp-amount">BLOCKS-LP Token Amount</Label>
          <div className="relative">
            <Input
              id="lp-amount"
              type="number"
              placeholder="0.0"
              value={lpAmount}
              onChange={(e) => setLpAmount(e.target.value)}
              className="pr-16"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMaxClick}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs"
              disabled={balancesLoading}
            >
              MAX
            </Button>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span>Balance: {formattedBalances.lp} BLOCKS-LP</span>
            </div>
            {tokenPrices && (
              <span>1 BLOCKS = ${tokenPrices.shareTokenPriceInUSDT.toFixed(4)} USDT</span>
            )}
          </div>
        </div>

        {/* LP Token notice removed; using raw balances */}

        {/* Protection Settings */}
        <div className="space-y-4">
          {/* Slippage Protection Settings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Slippage Protection</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSlippageSettings(!showSlippageSettings)}
              >
                <Shield className="h-4 w-4 mr-1" />
                {slippageSettings.tolerance.toFixed(2)}%
              </Button>
            </div>

            {showSlippageSettings && (
              <SlippageProtectionSettings
                settings={slippageSettings}
                onSettingsChange={setSlippageSettings}
                expectedPriceImpact={preview?.priceImpact || 0}
                liquidityDepth={preview ? {
                  shareToken: preview.expectedShareToken,
                  usdt: preview.expectedUSDT
                } : undefined}
              />
            )}
          </div>

          {/* MEV Protection Settings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>MEV Protection</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMEVSettings(!showMEVSettings)}
              >
                <Shield className="h-4 w-4 mr-1" />
                {mevSettings.enabled ? 'ACTIVE' : 'DISABLED'}
              </Button>
            </div>

            {showMEVSettings && (
              <MEVProtectionSettings
                config={mevSettings}
                onConfigChange={setMevSettings}
                networkCongestion="medium"
              />
            )}
          </div>
        </div>

        {/* Enhanced Preview */}
        <LiquidityRedemptionPreview
          preview={preview}
          loading={loading}
          tokenPrices={tokenPrices}
          onRefresh={() => {
            if (lpAmount && parseFloat(lpAmount) > 0) {
              const amount = parseEther(lpAmount);
              if (amount <= balances.lp) {
                getPreview(amount);
              }
            }
          }}
          autoRefresh={true}
          refreshInterval={30}
        />

        {/* Protection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className={`h-4 w-4 ${mevSettings.enabled ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={`text-sm ${mevSettings.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                MEV Protection {mevSettings.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600">
                Slippage: {slippageSettings.tolerance.toFixed(2)}%
              </span>
            </div>
          </div>
          <Badge variant="secondary">BSC Testnet</Badge>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleRedemption}
          disabled={
            !isConnected ||
            !isCorrectNetwork ||
            !lpAmount ||
            parseFloat(lpAmount) <= 0 ||
            (() => {
              const userInputAmount = parseEther(lpAmount);
              const rawAmount = userInputAmount;
              return rawAmount > balances.lp;
            })() ||
            loading ||
            !preview
          }
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Removing Liquidity...
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4 mr-2" />
              Remove Liquidity
            </>
          )}
        </Button>

        {/* Info Text */}
        <p className="text-xs text-gray-500 text-center">
          This will remove your liquidity from the PancakeSwap USDT/BLOCKS pool and return the underlying tokens to your wallet.
        </p>
      </CardContent>
    </Card>
  );
}
