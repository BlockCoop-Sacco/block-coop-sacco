import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { Badge } from '../ui/Badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Settings, 
  Shield, 
  AlertTriangle, 
  Info,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export interface SlippageSettings {
  tolerance: number;
  deadline: number;
  autoSlippage: boolean;
  maxSlippage: number;
}

interface SlippageProtectionSettingsProps {
  settings: SlippageSettings;
  onSettingsChange: (settings: SlippageSettings) => void;
  expectedPriceImpact?: number;
  liquidityDepth?: {
    shareToken: bigint;
    usdt: bigint;
  };
}

const PRESET_SLIPPAGES = [0.1, 0.5, 1.0, 2.0];
const PRESET_DEADLINES = [5, 10, 20, 30]; // minutes

export function SlippageProtectionSettings({
  settings,
  onSettingsChange,
  expectedPriceImpact = 0,
  liquidityDepth
}: SlippageProtectionSettingsProps) {
  const [customSlippage, setCustomSlippage] = useState(settings.tolerance.toString());
  const [customDeadline, setCustomDeadline] = useState(settings.deadline.toString());
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-calculate recommended slippage based on liquidity depth and price impact
  const calculateRecommendedSlippage = (): number => {
    let baseSlippage = 0.5; // Default 0.5%
    
    // Increase slippage for higher price impact
    if (expectedPriceImpact > 1) {
      baseSlippage = Math.max(baseSlippage, expectedPriceImpact * 1.5);
    }
    
    // Increase slippage for low liquidity
    if (liquidityDepth) {
      const totalLiquidityUSD = Number(liquidityDepth.usdt) / 1e6; // Convert to USD
      if (totalLiquidityUSD < 10000) { // Less than $10k liquidity
        baseSlippage += 1.0;
      } else if (totalLiquidityUSD < 50000) { // Less than $50k liquidity
        baseSlippage += 0.5;
      }
    }
    
    return Math.min(baseSlippage, 15); // Cap at 15%
  };

  const recommendedSlippage = calculateRecommendedSlippage();

  useEffect(() => {
    if (settings.autoSlippage) {
      const newSlippage = recommendedSlippage;
      if (newSlippage !== settings.tolerance) {
        onSettingsChange({
          ...settings,
          tolerance: newSlippage
        });
        setCustomSlippage(newSlippage.toString());
      }
    }
  }, [recommendedSlippage, settings.autoSlippage]);

  const handleSlippageChange = (newSlippage: number) => {
    const clampedSlippage = Math.max(0.01, Math.min(50, newSlippage));
    setCustomSlippage(clampedSlippage.toString());
    onSettingsChange({
      ...settings,
      tolerance: clampedSlippage,
      autoSlippage: false
    });
  };

  const handleDeadlineChange = (newDeadline: number) => {
    const clampedDeadline = Math.max(1, Math.min(60, newDeadline));
    setCustomDeadline(clampedDeadline.toString());
    onSettingsChange({
      ...settings,
      deadline: clampedDeadline
    });
  };

  const toggleAutoSlippage = () => {
    const newAutoSlippage = !settings.autoSlippage;
    onSettingsChange({
      ...settings,
      autoSlippage: newAutoSlippage
    });
    
    if (newAutoSlippage) {
      handleSlippageChange(recommendedSlippage);
    }
  };

  const getSlippageColor = (slippage: number): string => {
    if (slippage <= 0.5) return 'text-green-600';
    if (slippage <= 1) return 'text-yellow-600';
    if (slippage <= 3) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSlippageWarning = (slippage: number): string | null => {
    if (slippage > 15) return 'Extremely high slippage! You may lose significant value.';
    if (slippage > 5) return 'Very high slippage tolerance may result in unfavorable rates.';
    if (slippage > 1) return 'High slippage tolerance detected.';
    if (slippage < 0.1) return 'Very low slippage may cause transaction failures.';
    return null;
  };

  const slippageWarning = getSlippageWarning(settings.tolerance);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="font-medium">Slippage Protection</span>
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
        {/* Auto Slippage Toggle */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Auto Slippage</span>
            {settings.autoSlippage && (
              <Badge variant="secondary" className="text-xs">
                {recommendedSlippage.toFixed(2)}%
              </Badge>
            )}
          </div>
          <Button
            variant={settings.autoSlippage ? "default" : "outline"}
            size="sm"
            onClick={toggleAutoSlippage}
          >
            {settings.autoSlippage ? 'ON' : 'OFF'}
          </Button>
        </div>

        {/* Slippage Tolerance */}
        <div className="space-y-2">
          <Label>Slippage Tolerance</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_SLIPPAGES.map((preset) => (
              <Button
                key={preset}
                variant={Math.abs(settings.tolerance - preset) < 0.01 ? "default" : "outline"}
                size="sm"
                onClick={() => handleSlippageChange(preset)}
                disabled={settings.autoSlippage}
              >
                {preset}%
              </Button>
            ))}
            <div className="flex items-center space-x-1">
              <Input
                type="number"
                placeholder="Custom"
                value={customSlippage}
                onChange={(e) => {
                  setCustomSlippage(e.target.value);
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    handleSlippageChange(value);
                  }
                }}
                className="w-20 text-sm"
                step="0.1"
                min="0.01"
                max="50"
                disabled={settings.autoSlippage}
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className={getSlippageColor(settings.tolerance)}>
              Current: {settings.tolerance.toFixed(2)}%
            </span>
            {!settings.autoSlippage && (
              <span className="text-gray-500">
                Recommended: {recommendedSlippage.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        {/* Slippage Warning */}
        {slippageWarning && (
          <Alert variant={settings.tolerance > 5 ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{slippageWarning}</AlertDescription>
          </Alert>
        )}

        {/* Transaction Deadline */}
        <div className="space-y-2">
          <Label>Transaction Deadline</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_DEADLINES.map((preset) => (
              <Button
                key={preset}
                variant={settings.deadline === preset ? "default" : "outline"}
                size="sm"
                onClick={() => handleDeadlineChange(preset)}
              >
                {preset}m
              </Button>
            ))}
            <div className="flex items-center space-x-1">
              <Input
                type="number"
                value={customDeadline}
                onChange={(e) => {
                  setCustomDeadline(e.target.value);
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    handleDeadlineChange(value);
                  }
                }}
                className="w-16 text-sm"
                min="1"
                max="60"
              />
              <span className="text-sm text-gray-500">min</span>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span className="font-medium">Advanced Protection</span>
            </div>

            {/* Max Slippage */}
            <div className="space-y-2">
              <Label>Maximum Slippage (Safety Limit)</Label>
              <Input
                type="number"
                value={settings.maxSlippage}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 15;
                  onSettingsChange({
                    ...settings,
                    maxSlippage: Math.max(settings.tolerance, Math.min(50, value))
                  });
                }}
                className="w-24"
                step="0.5"
                min={settings.tolerance}
                max="50"
              />
              <p className="text-xs text-gray-500">
                Transactions will fail if slippage exceeds this limit
              </p>
            </div>

            {/* Market Conditions Info */}
            {liquidityDepth && (
              <div className="space-y-2">
                <Label>Market Conditions</Label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span>USDT Liquidity: ${(Number(liquidityDepth.usdt) / 1e6).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-blue-600" />
                    <span>BLOCKS Liquidity: {(Number(liquidityDepth.shareToken) / 1e18).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Info className="h-4 w-4 text-gray-500" />
                  <span className={getSlippageColor(expectedPriceImpact)}>
                    Expected Price Impact: {expectedPriceImpact.toFixed(3)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Protection Summary */}
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Protection Active</span>
          </div>
          <div className="text-xs text-green-700 space-y-1">
            <div>✓ Slippage limited to {settings.tolerance.toFixed(2)}%</div>
            <div>✓ Transaction expires in {settings.deadline} minutes</div>
            <div>✓ MEV protection enabled</div>
            {settings.autoSlippage && <div>✓ Auto-adjustment based on market conditions</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
