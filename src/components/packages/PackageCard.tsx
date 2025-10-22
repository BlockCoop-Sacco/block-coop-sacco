import React, { useState, useEffect } from 'react';
import { PackageWithId, PackageSplits, calculateSplitsWithTargetPrice } from '../../lib/contracts';
import { formatUSDT, formatBLOCKS, formatExchangeRate, formatPercentage, formatDuration } from '../../lib/utils';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Clock, Users, Coins, RefreshCw, Flame } from 'lucide-react';
import { useCurrentMarketPrice } from '../../hooks/useContracts';
import Tilt from 'react-parallax-tilt';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import * as Tooltip from '@radix-ui/react-tooltip';

interface PackageCardProps {
  package: PackageWithId;
  onPurchase: (pkg: PackageWithId) => void;
  featured?: boolean;
}

function PackageCardInner({ package: pkg, onPurchase, featured }: PackageCardProps) {
  const [splits, setSplits] = useState<PackageSplits>({
    totalTokens: 0n,
    vestTokens: 0n,
    poolTokens: 0n,
    usdtPool: 0n,
    usdtVault: 0n,
  });
  
  const { marketPrice } = useCurrentMarketPrice();
  const [hovered, setHovered] = useState(false);

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
        const calculatedSplits = await calculateSplitsWithTargetPrice(pkg);
        setSplits(calculatedSplits);
      } catch (error) {
        console.error('Error calculating splits for package:', pkg.name, error);
      }
    };

    loadSplits();
  }, [pkg]);

  // ROI Calculations
  const exchangeRateNum = Number(pkg.exchangeRate) / 1e18;
  const marketPriceNum = marketPrice ? Number(marketPrice) / 1e18 : null;
  const entryAmountNum = Number(pkg.entryUSDT) / 1e18;
  const roiPct = marketPriceNum != null && exchangeRateNum > 0
    ? ((marketPriceNum - exchangeRateNum) / exchangeRateNum) * 100
    : null;
  const roiValue = roiPct != null ? (roiPct / 100) * entryAmountNum : null;

  // Animated numbers
  const roiPctSpring = useSpring(roiPct ?? 0, { stiffness: 80, damping: 20, mass: 0.8 });
  const roiValueSpring = useSpring(roiValue ?? 0, { stiffness: 80, damping: 20, mass: 0.8 });
  useEffect(() => {
    if (roiPct != null) roiPctSpring.set(roiPct);
    if (roiValue != null) roiValueSpring.set(roiValue);
  }, [roiPct, roiValue]);
  const roiPctText = useTransform(roiPctSpring, (v) => `${v.toFixed(2)}%`);
  const roiValueText = useTransform(roiValueSpring, (v) => `$${v.toFixed(2)}`);
  
  return (
    <Tilt glareEnable={true} glareMaxOpacity={0.15} glareColor="#38bdf8" glarePosition="all" scale={1.01} tiltMaxAngleX={6} tiltMaxAngleY={6}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        whileHover={{ scale: 1.005 }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
      >
        <Card className={`group relative overflow-hidden border border-white/10 dark:border-white/5 bg-white/5 dark:bg-white/5 backdrop-blur-md hover:ring-1 hover:ring-sky-400/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${featured ? 'ring-2 ring-amber-400/60 shadow-[0_0_40px_rgba(251,191,36,0.25)]' : ''}`}>
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-tr from-sky-400/20 via-blue-500/10 to-indigo-600/10 blur-2xl" />
          {featured && (
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_4px_14px_rgba(251,191,36,0.4)]">
                <Flame className="h-3.5 w-3.5" /> Popular
              </span>
            </div>
          )}
          <CardContent className="p-6">
            {/* Top Section */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-[1.25rem] font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-600">{pkg.name}</h3>
                <div className="mt-1 text-[1.5rem] font-semibold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-300 dark:to-yellow-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                  ${formatUSDT(pkg.entryUSDT)} <span className="text-sm font-normal text-gray-600 dark:text-gray-300">USDT</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`h-2.5 w-2.5 rounded-full ${pkg.active ? 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(16,185,129,0.45)] animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{pkg.active ? 'Active' : 'Locked'}</span>
              </div>
            </div>

            {/* Middle Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg p-4 border border-white/10 bg-white/5 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-16">
                    <CircularProgressbar
                      value={Math.max(0, Math.min(roiPct ?? 0, 300))}
                      maxValue={300}
                      strokeWidth={10}
                      styles={buildStyles({
                        pathColor: 'rgb(16,185,129)',
                        trailColor: 'rgba(255,255,255,0.15)',
                        textColor: '#111827',
                      })}
                    />
                  </div>
                  <div className="text-right">
                    <Tooltip.Provider delayDuration={150}>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <div className="text-xs text-gray-500 flex items-center justify-end">ROI %</div>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content className="rounded-md bg-black/80 px-2 py-1 text-xs text-white" sideOffset={6}>
                            Return on Investment compared to exchange rate
                            <Tooltip.Arrow className="fill-black/80" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                    <div className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-600">
                      {roiPct != null ? <motion.span>{roiPctText}</motion.span> : '—'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4 border border-white/10 bg-white/5 dark:bg-white/5">
                <div className="flex items-start justify-between">
                  <div className="text-xs text-gray-500">ROI Value</div>
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{roiValue != null ? <motion.span>{roiValueText}</motion.span> : '—'}</div>
                </div>
                <div className="mt-3 border-t border-white/10 pt-3 flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-gray-500"><Coins className="h-4 w-4" /><span>Tokens</span></div>
                  <div className="font-medium">{formatBLOCKS(splits.totalTokens)} BLOCKS</div>
                </div>
                <div className="mt-2 border-t border-white/10 pt-3 flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-gray-500"><RefreshCw className="h-4 w-4" /><span>Exchange Rate</span></div>
                  <div className="font-medium">{formatExchangeRate(pkg.exchangeRate)} USDT/BLOCKS</div>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <Clock className="w-4 h-4" />
                <span>Vesting Period:</span>
                <span className="font-medium">{formatDuration(pkg.duration)}</span>
              </div>
              <div className="h-1.5 rounded bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 opacity-70" />
            </div>

            <AnimatePresence>
              {hovered && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-3 text-xs text-gray-600 dark:text-gray-300 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <Users className="h-3.5 w-3.5" />
                    <span>Referral:</span>
                    <span className="font-medium">{formatPercentage(pkg.referralBps)}</span>
                  </div>
                  <div className="text-gray-500">Vesting applies to portion of tokens</div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="p-6 pt-0">
            <Button 
              onClick={() => onPurchase(pkg)}
              className="w-full transition-all duration-300 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow hover:shadow-[0_0_24px_rgba(59,130,246,0.45)]"
              size="lg"
            >
              Purchase Package
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </Tilt>
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
