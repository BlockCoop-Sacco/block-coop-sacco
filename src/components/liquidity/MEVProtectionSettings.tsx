import React, { useState, useEffect } from 'react';
import { ethers, formatUnits } from 'ethers';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { Badge } from '../ui/Badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Shield, 
  Zap, 
  Clock, 
  DollarSign,
  AlertTriangle, 
  Info,
  CheckCircle,
  Activity,
  Lock,
  Unlock
} from 'lucide-react';
import { useWeb3 } from '../../providers/Web3Provider';

export interface MEVProtectionConfig {
  enabled: boolean;
  maxGasPrice: bigint;
  priorityFee: bigint;
  deadline: number; // minutes
  usePrivateMempool: boolean;
  frontrunProtection: boolean;
  sandwichProtection: boolean;
  flashloanProtection: boolean;
}

interface MEVProtectionSettingsProps {
  config: MEVProtectionConfig;
  onConfigChange: (config: MEVProtectionConfig) => void;
  currentGasPrice?: bigint;
  networkCongestion?: 'low' | 'medium' | 'high';
}

const DEFAULT_MEV_CONFIG: MEVProtectionConfig = {
  enabled: true,
  maxGasPrice: ethers.parseUnits('20', 'gwei'),
  priorityFee: ethers.parseUnits('2', 'gwei'),
  deadline: 5,
  usePrivateMempool: false,
  frontrunProtection: true,
  sandwichProtection: true,
  flashloanProtection: true,
};

export function MEVProtectionSettings({
  config,
  onConfigChange,
  currentGasPrice,
  networkCongestion = 'medium'
}: MEVProtectionSettingsProps) {
  const { provider } = useWeb3();
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch current gas price
  useEffect(() => {
    const fetchGasPrice = async () => {
      if (provider) {
        try {
          const price = await provider.getGasPrice();
          setGasPrice(price);
        } catch (error) {
          console.error('Failed to fetch gas price:', error);
        }
      }
    };

    fetchGasPrice();
    const interval = setInterval(fetchGasPrice, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [provider]);

  const effectiveGasPrice = currentGasPrice || gasPrice;

  const getRecommendedMaxGasPrice = (): bigint => {
    if (!effectiveGasPrice) return ethers.parseUnits('20', 'gwei');
    
    // Add 50% buffer to current gas price
    const buffer = effectiveGasPrice * 50n / 100n;
    return effectiveGasPrice + buffer;
  };

  const getNetworkCongestionColor = (congestion: string): string => {
    switch (congestion) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getNetworkCongestionIcon = (congestion: string) => {
    switch (congestion) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatGasPrice = (price: bigint): string => {
    return parseFloat(formatUnits(price, 'gwei')).toFixed(2);
  };

  const handleMaxGasPriceChange = (value: string) => {
    try {
      const newPrice = ethers.parseUnits(value, 'gwei');
      onConfigChange({
        ...config,
        maxGasPrice: newPrice
      });
    } catch (error) {
      console.error('Invalid gas price:', error);
    }
  };

  const handlePriorityFeeChange = (value: string) => {
    try {
      const newFee = ethers.parseUnits(value, 'gwei');
      onConfigChange({
        ...config,
        priorityFee: newFee
      });
    } catch (error) {
      console.error('Invalid priority fee:', error);
    }
  };

  const toggleProtection = (protection: keyof MEVProtectionConfig) => {
    onConfigChange({
      ...config,
      [protection]: !config[protection]
    });
  };

  const resetToDefaults = () => {
    onConfigChange(DEFAULT_MEV_CONFIG);
  };

  const isGasPriceTooHigh = effectiveGasPrice && effectiveGasPrice > config.maxGasPrice;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <span className="font-medium">MEV Protection</span>
            {config.enabled ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Lock className="h-3 w-3 mr-1" />
                ACTIVE
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                <Unlock className="h-3 w-3 mr-1" />
                DISABLED
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            Advanced
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Protection Toggle */}
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">Enable MEV Protection</span>
          </div>
          <Button
            variant={config.enabled ? "default" : "outline"}
            size="sm"
            onClick={() => toggleProtection('enabled')}
          >
            {config.enabled ? 'ON' : 'OFF'}
          </Button>
        </div>

        {config.enabled && (
          <>
            {/* Network Status */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Network Status</span>
                <div className="flex items-center space-x-1">
                  {getNetworkCongestionIcon(networkCongestion)}
                  <span className={`text-sm ${getNetworkCongestionColor(networkCongestion)}`}>
                    {networkCongestion.toUpperCase()}
                  </span>
                </div>
              </div>
              
              {effectiveGasPrice && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Current Gas:</span>
                    <span className="ml-2 font-medium">{formatGasPrice(effectiveGasPrice)} Gwei</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Max Gas:</span>
                    <span className="ml-2 font-medium">{formatGasPrice(config.maxGasPrice)} Gwei</span>
                  </div>
                </div>
              )}
            </div>

            {/* Gas Price Warning */}
            {isGasPriceTooHigh && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Current gas price ({formatGasPrice(effectiveGasPrice!)} Gwei) exceeds your maximum limit ({formatGasPrice(config.maxGasPrice)} Gwei). 
                  Transaction may fail or be delayed.
                </AlertDescription>
              </Alert>
            )}

            {/* Gas Settings */}
            <div className="space-y-3">
              <Label>Gas Price Limits</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Max Gas Price (Gwei)</Label>
                  <Input
                    type="number"
                    value={formatGasPrice(config.maxGasPrice)}
                    onChange={(e) => handleMaxGasPriceChange(e.target.value)}
                    className="text-sm"
                    step="0.1"
                    min="1"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Priority Fee (Gwei)</Label>
                  <Input
                    type="number"
                    value={formatGasPrice(config.priorityFee)}
                    onChange={(e) => handlePriorityFeeChange(e.target.value)}
                    className="text-sm"
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMaxGasPriceChange(formatGasPrice(getRecommendedMaxGasPrice()))}
                >
                  Use Recommended
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefaults}
                >
                  Reset Defaults
                </Button>
              </div>
            </div>

            {/* Transaction Deadline */}
            <div className="space-y-2">
              <Label>Transaction Deadline</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={config.deadline}
                  onChange={(e) => onConfigChange({
                    ...config,
                    deadline: parseInt(e.target.value) || 5
                  })}
                  className="w-20"
                  min="1"
                  max="60"
                />
                <span className="text-sm text-gray-600">minutes</span>
              </div>
              <p className="text-xs text-gray-500">
                Shorter deadlines reduce MEV risk but may cause failures during network congestion
              </p>
            </div>

            {/* Advanced Protection Features */}
            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span className="font-medium">Advanced Protection</span>
                </div>

                <div className="space-y-3">
                  {/* Private Mempool */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Private Mempool</span>
                      <p className="text-xs text-gray-500">Route through private mempool (when available)</p>
                    </div>
                    <Button
                      variant={config.usePrivateMempool ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleProtection('usePrivateMempool')}
                    >
                      {config.usePrivateMempool ? 'ON' : 'OFF'}
                    </Button>
                  </div>

                  {/* Frontrun Protection */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Frontrun Protection</span>
                      <p className="text-xs text-gray-500">Detect and prevent frontrunning attacks</p>
                    </div>
                    <Button
                      variant={config.frontrunProtection ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleProtection('frontrunProtection')}
                    >
                      {config.frontrunProtection ? 'ON' : 'OFF'}
                    </Button>
                  </div>

                  {/* Sandwich Protection */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Sandwich Protection</span>
                      <p className="text-xs text-gray-500">Prevent sandwich attacks on your transaction</p>
                    </div>
                    <Button
                      variant={config.sandwichProtection ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleProtection('sandwichProtection')}
                    >
                      {config.sandwichProtection ? 'ON' : 'OFF'}
                    </Button>
                  </div>

                  {/* Flashloan Protection */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Flashloan Protection</span>
                      <p className="text-xs text-gray-500">Monitor for flashloan-based MEV attacks</p>
                    </div>
                    <Button
                      variant={config.flashloanProtection ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleProtection('flashloanProtection')}
                    >
                      {config.flashloanProtection ? 'ON' : 'OFF'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Protection Summary */}
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Active Protections</span>
              </div>
              <div className="text-xs text-green-700 space-y-1">
                <div>✓ Gas price limited to {formatGasPrice(config.maxGasPrice)} Gwei</div>
                <div>✓ Transaction expires in {config.deadline} minutes</div>
                {config.frontrunProtection && <div>✓ Frontrun protection enabled</div>}
                {config.sandwichProtection && <div>✓ Sandwich attack protection enabled</div>}
                {config.flashloanProtection && <div>✓ Flashloan attack monitoring enabled</div>}
                {config.usePrivateMempool && <div>✓ Private mempool routing enabled</div>}
              </div>
            </div>
          </>
        )}

        {!config.enabled && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              MEV protection is disabled. Your transactions may be vulnerable to frontrunning, sandwich attacks, and other MEV exploitation.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
