import React, { useState, useEffect } from 'react';
import { PackageWithId, PackageSplits, calculateSplitsWithTargetPrice } from '../../lib/contracts';
import { formatUSDT, formatBLOCKS, formatExchangeRate, formatPercentage, formatDuration } from '../../lib/utils';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { TrendingUp, Clock, Users, Percent, Loader2 } from 'lucide-react';

interface PackageCardProps {
  package: PackageWithId;
  onPurchase: (pkg: PackageWithId) => void;
}

function PackageCardInner({ package: pkg, onPurchase }: PackageCardProps) {
  const [splits, setSplits] = useState<PackageSplits>({
    totalTokens: 0n,
    vestTokens: 0n,
    poolTokens: 0n,
    usdtPool: 0n,
    usdtVault: 0n,
  });
  const [loading, setLoading] = useState(true);

  // Debug raw package values from props
  useEffect(() => {
    if (pkg) {
      console.log("📦 [DEBUG] Raw Package Data:", {
        id: pkg.id,
        name: pkg.name,
        entryUSDT: formatUSDT(pkg.entryUSDT),
        exchangeRate: formatExchangeRate(pkg.exchangeRate),
        vestBps: pkg.vestBps,
        cliff: pkg.cliff,
        duration: pkg.duration,
        referralBps: pkg.referralBps,
        active: pkg.active,
        exists: pkg.exists,
      });
    }
  }, [pkg]);

  // Calculate splits with current global target price
  useEffect(() => {
    const loadSplits = async () => {
      try {
        setLoading(true);
        const calculatedSplits = await calculateSplitsWithTargetPrice(pkg);
        setSplits(calculatedSplits);
      } catch (error) {
        console.error('Error calculating splits for package:', pkg.name, error);
      } finally {
        setLoading(false);
      }
    };

    loadSplits();
  }, [pkg]);

  const lpPercentage = 30; 
  const vestPercentage = 70; 
  
  return (
    <Card className="group hover:scale-[1.02] transition-all duration-300 animate-fade-in">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{pkg.name}</h3>
            <div className="flex items-center text-2xl font-bold text-primary-600">
              <span className="text-sm text-gray-500 mr-1">$</span>
              {formatUSDT(pkg.entryUSDT)}
              <span className="text-sm text-gray-500 ml-1">USDT</span>
            </div>
          </div>
          <Badge variant="info">
            <TrendingUp className="w-3 h-3 mr-1" />
            {pkg.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="space-y-4">
          {/* Distribution */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Percent className="w-4 h-4 mr-2" />
              Token Distribution
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">USDT Split:</span>
                <div className="text-sm font-medium">
                  <span className="text-accent-600">{lpPercentage}% LP</span>
                  <span className="text-gray-400 mx-2">|</span>
                  <span className="text-primary-600">{vestPercentage}% Treasury</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">SHARE Split:</span>
                <div className="text-sm font-medium">
                  <span className="text-accent-600">{lpPercentage}% LP</span>
                  <span className="text-gray-400 mx-2">|</span>
                  <span className="text-primary-600">{vestPercentage}% Vest</span>
                </div>
              </div>
              
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div className="bg-accent-500" style={{ width: `${lpPercentage}%` }} />
                  <div className="bg-primary-500" style={{ width: `${vestPercentage}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Package Details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Vesting</p>
                <p className="text-sm font-medium">{formatDuration(pkg.duration)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Referral</p>
                <p className="text-sm font-medium">{formatPercentage(pkg.referralBps)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Exchange Rate</p>
                <p className="text-sm font-medium">{formatExchangeRate(pkg.exchangeRate)} USDT/BLOCKS</p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="border-t pt-4">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Calculating with current target price...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">LP Pool USDT</p>
                  <p className="font-medium">{formatUSDT(splits.usdtPool)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Treasury USDT</p>
                  <p className="font-medium">{formatUSDT(splits.usdtVault)}</p>
                </div>
                <div>
                  <p className="text-gray-500">LP Pool BLOCKS</p>
                  <p className="font-medium">{formatBLOCKS(splits.poolTokens)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Vested BLOCKS</p>
                  <p className="font-medium">{formatBLOCKS(splits.vestTokens)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-6 pt-0">
        <Button 
          onClick={() => onPurchase(pkg)}
          className="w-full group-hover:shadow-lg transition-all duration-300"
          size="lg"
        >
          Purchase Package
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PackageCard(props: PackageCardProps) {
  return (
    <ErrorBoundary
      fallback={
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-2">⚠️ Package Load Error</div>
            <p className="text-sm text-red-700">
              Unable to load package "{props.package.name}". This may be due to missing contract data.
            </p>
          </CardContent>
        </Card>
      }
    >
      <PackageCardInner {...props} />
    </ErrorBoundary>
  );
}
