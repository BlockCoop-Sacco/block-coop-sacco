import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../../providers/Web3Provider';
import { Package, getContracts, getSigner } from '../../lib/contracts';
import { PackageCard } from './PackageCard';
import { PurchaseModal } from './PurchaseModal';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { NetworkGuard } from '../ui/NetworkStatus';
import { Loader2, Package2, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCurrentMarketPrice } from '../../hooks/useContracts';
import { validateAppKitConfig } from '../../lib/appkit';
import toast from 'react-hot-toast';

export function PackageList() {
  const { isConnected } = useWeb3();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const { marketPrice } = useCurrentMarketPrice();

  useEffect(() => {
    // Check configuration before attempting to load packages
    const errors = validateAppKitConfig();
    if (errors.length > 0) {
      setConfigError(errors.join('. '));
      setLoading(false);
      return;
    }
    
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setConfigError(null);

      const contracts = getContracts();

      // Fetch package count and generate IDs
      const packageCount = await contracts.packageManager.nextPackageId();
      console.log(`📦 Total packages: ${packageCount}`);

      // Generate array of package IDs [0, 1, 2, ...]
      const packageIds = Array.from({ length: Number(packageCount) }, (_, i) => i);
      console.log(`📦 Package IDs to fetch:`, packageIds);

      const packagePromises = packageIds.map(async (id: number) => {
        const pkg = await contracts.packageManager.getPackage(id);

        // Debug logging
        console.log(`🔍 Raw package data for ID ${id}:`, pkg);
        console.log(`🔍 Is array:`, Array.isArray(pkg));
        console.log(`🔍 Package keys:`, Object.keys(pkg));

        // Handle both array and object formats
        let packageData;
        if (Array.isArray(pkg)) {
          // If returned as array, map to object structure according to contract struct
          // struct Package { entryUSDT, exchangeRate, cliff, duration, vestBps, referralBps, active, exists, name }
          packageData = {
            entryUSDT: pkg[0],
            exchangeRate: pkg[1],
            cliff: pkg[2],
            duration: pkg[3],
            vestBps: pkg[4],
            referralBps: pkg[5],
            active: pkg[6],
            exists: pkg[7],
            name: pkg[8]
          };
          console.log(`🔍 Converted array to object:`, packageData);
        } else {
          // If returned as object, use directly
          packageData = {
            name: pkg.name,
            entryUSDT: pkg.entryUSDT,
            exchangeRate: pkg.exchangeRate,
            vestBps: pkg.vestBps,
            cliff: pkg.cliff,
            duration: pkg.duration,
            referralBps: pkg.referralBps,
            active: pkg.active,
            exists: pkg.exists
          };
          console.log(`🔍 Using object format:`, packageData);
        }

        console.log(`🔍 Final package data:`, {
          name: packageData.name,
          entryUSDT: packageData.entryUSDT?.toString(),
          exchangeRate: packageData.exchangeRate?.toString(),
          vestBps: packageData.vestBps?.toString(),
          cliff: packageData.cliff?.toString(),
          duration: packageData.duration?.toString(),
          referralBps: packageData.referralBps?.toString(),
          active: packageData.active,
          exists: packageData.exists
        });

        return {
          id: Number(id),
          name: packageData.name,
          entryUSDT: packageData.entryUSDT,
          exchangeRate: packageData.exchangeRate,
          vestBps: Number(packageData.vestBps),
          cliff: Number(packageData.cliff),
          duration: Number(packageData.duration),
          referralBps: Number(packageData.referralBps),
          active: packageData.active,
          exists: packageData.exists,
        };
      });

      const loadedPackages = await Promise.all(packagePromises);
      // Filter to only show active packages that exist
      const activePackages = loadedPackages.filter(pkg => pkg.exists && pkg.active);
      setPackages(activePackages);
    } catch (error: any) {
      console.error('Error loading packages:', error);

      if (error.code === 'CALL_EXCEPTION') {
        setConfigError('Contract not found. Please ensure the Package Manager contract is deployed and the address is correct in your .env file.');
      } else {
        toast.error('Failed to load packages');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (pkg: Package) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    setSelectedPackage(pkg);
  };

  if (configError) {
    return (
      <Card className="border-error-200 bg-error-50">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-error-900 mb-2">Configuration Error</h3>
          <p className="text-error-700 mb-4">{configError}</p>
          <div className="text-sm text-error-600">
            <p>Please check your .env file and ensure:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>All contract addresses are valid and deployed</li>
              <li>WalletConnect Project ID is obtained from cloud.walletconnect.com</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading packages...</p>
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No packages available</h3>
          <p className="text-gray-600">Check back later for new investment packages.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <NetworkGuard>
      <div className="space-y-6">
        {/* Package Information */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">Investment Packages</h3>
              </div>
              <div className="flex items-center space-x-1 text-blue-600">
                <Info className="h-4 w-4" />
                <span className="text-sm">Per-Package Rates</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-blue-900">
                  Stable LP Pricing with Target Prices
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Each package maintains consistent USDT/BLOCKS ratios in LP pools
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600 font-medium">Token Distribution</p>
                <p className="text-xs text-blue-500">Dynamic vesting • Stable LP pricing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Packages Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
       >
          {(() => {
            // Determine featured package by highest ROI based on current market price
            let featuredId: number | null = null;
            if (marketPrice) {
              const marketNum = Number(marketPrice) / 1e18;
              let bestRoi = -Infinity;
              for (const p of packages) {
                const exNum = Number(p.exchangeRate) / 1e18;
                if (exNum > 0) {
                  const roi = ((marketNum - exNum) / exNum) * 100;
                  if (roi > bestRoi) {
                    bestRoi = roi;
                    featuredId = p.id;
                  }
                }
              }
            }
            return packages.map((pkg) => (
              <motion.div key={pkg.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <PackageCard
                  package={pkg}
                  onPurchase={handlePurchase}
                  featured={featuredId === pkg.id}
                />
              </motion.div>
            ));
          })()}
        </motion.div>
      </div>

      {selectedPackage && (
        <PurchaseModal
          package={selectedPackage}
          isOpen={true}
          onClose={() => setSelectedPackage(null)}
          onSuccess={() => {
            setSelectedPackage(null);
            loadPackages();
          }}
        />
      )}
    </NetworkGuard>
  );
}