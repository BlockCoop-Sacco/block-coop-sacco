import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { ethers } from 'ethers';
import { Package, getContracts } from '../../lib/contracts';

import { useWeb3 } from '../../providers/Web3Provider';
import { validateWalletForTransaction, debugWalletState } from '../../lib/walletValidation';
import { useWalletRefresh, shouldAttemptWalletRefresh } from '../../lib/walletRefresh';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface PackageFormProps {
  package?: Package | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Helper functions for converting between user-friendly and contract formats
const bpsToPercentage = (bps: number): string => {
  return (bps / 100).toString();
};

const percentageToBps = (percentage: string): number => {
  return Math.round(parseFloat(percentage || '0') * 100);
};

const exchangeRateToDecimal = (exchangeRate: bigint): string => {
  return ethers.formatUnits(exchangeRate, 18); // Convert from wei to USDT (18 decimals for V2)
};

const decimalToExchangeRate = (decimal: string): bigint => {
  return ethers.parseUnits(decimal || '0', 18); // Convert to wei with 18-decimal precision for V2
};

const secondsToTimeUnits = (seconds: number): { years: string; months: string; days: string } => {
  const totalDays = Math.floor(seconds / (24 * 3600));
  const years = Math.floor(totalDays / 365);
  const remainingDays = totalDays % 365;
  const months = Math.floor(remainingDays / 30);
  const days = remainingDays % 30;

  return {
    years: years.toString(),
    months: months.toString(),
    days: days.toString(),
  };
};

const timeUnitsToSeconds = (years: string, months: string, days: string): number => {
  const y = parseInt(years || '0');
  const m = parseInt(months || '0');
  const d = parseInt(days || '0');

  return (y * 365 + m * 30 + d) * 24 * 3600;
};

export function PackageForm({ package: pkg, isOpen, onClose, onSuccess }: PackageFormProps) {
  // Use Web3Provider context for proper signer access
  const { provider, signer, isConnected, account, isCorrectNetwork, chainId, connectWallet, switchToCorrectNetwork } = useWeb3();

  // Wallet refresh utility for handling signer timing issues
  const { refreshWallet } = useWalletRefresh();

  const [formData, setFormData] = useState({
    name: '',
    entryUSDT: '',
    exchangeRate: '', // Exchange rate: USDT per BLOCKS price (decimal format, e.g., "2.0" for 2.0 USDT per BLOCKS)
    vestPercentage: '', // Changed from vestBps to percentage
    cliffYears: '', // Changed from cliff seconds to years
    cliffMonths: '', // Additional months
    cliffDays: '', // Additional days
    durationYears: '', // Changed from duration seconds to years
    durationMonths: '', // Additional months
    durationDays: '', // Additional days
    referralPercentage: '', // Changed from referralBps to percentage
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextPackageId, setNextPackageId] = useState<number | null>(null);

  // Fetch next package ID when form opens for new package creation
  useEffect(() => {
    const fetchNextPackageId = async () => {
      if (!pkg && isOpen) {
        try {
          const contracts = getContracts();
          const nextId = await contracts.packageManager.nextPackageId();
          setNextPackageId(Number(nextId));
        } catch (error) {
          console.error('Error fetching next package ID:', error);
          setNextPackageId(null);
        }
      }
    };

    fetchNextPackageId();
  }, [pkg, isOpen]);



  useEffect(() => {
    if (pkg) {
      // CRITICAL FIX: Detect if package uses 18 decimals (legacy) or 6 decimals (new format)
      // Legacy packages have very large values (>1e15), new packages have smaller values
      const isLegacyPackage = pkg.entryUSDT > 1000000000000000n; // > 1e15
      const displayValue = isLegacyPackage
        ? ethers.formatEther(pkg.entryUSDT) // Legacy: 18 decimals
        : ethers.formatUnits(pkg.entryUSDT, 6); // New: 6 decimals

      // Convert cliff and duration from seconds to user-friendly units
      const cliffTime = secondsToTimeUnits(pkg.cliff);
      const durationTime = secondsToTimeUnits(pkg.duration);

      setFormData({
        name: pkg.name,
        entryUSDT: displayValue,
        exchangeRate: exchangeRateToDecimal(pkg.exchangeRate),
        vestPercentage: bpsToPercentage(pkg.vestBps),
        cliffYears: cliffTime.years,
        cliffMonths: cliffTime.months,
        cliffDays: cliffTime.days,
        durationYears: durationTime.years,
        durationMonths: durationTime.months,
        durationDays: durationTime.days,
        referralPercentage: bpsToPercentage(pkg.referralBps),
      });
    } else {
      setFormData({
        name: '',
        entryUSDT: '',
        vestPercentage: '70', // 70% (7000 BPS)
        cliffYears: '1', // 1 year (31536000 seconds)
        cliffMonths: '0',
        cliffDays: '0',
        durationYears: '5', // 5 years (157680000 seconds)
        durationMonths: '0',
        durationDays: '0',
        referralPercentage: '2', // 2% (200 BPS)
      });
    }
  }, [pkg]);

  const handleWalletRefresh = async () => {
    if (!account) {
      toast.error('No account connected');
      return;
    }

    setRefreshing(true);
    try {
      console.log('PackageForm: Manual wallet refresh triggered');
      const refreshResult = await refreshWallet(account, { showToasts: true });

      if (refreshResult.success) {
        toast.success('Wallet connection refreshed successfully');
      } else {
        toast.error(`Failed to refresh wallet: ${refreshResult.error}`);
      }
    } catch (error) {
      console.error('Manual wallet refresh error:', error);
      toast.error('Error refreshing wallet connection');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Debug wallet state for troubleshooting
      console.log('PackageForm: Starting wallet validation...');
      await debugWalletState(provider, signer, account, chainId);

      // Check if we should attempt wallet refresh for signer timing issues
      if (shouldAttemptWalletRefresh(isConnected, account, signer, null)) {
        console.log('PackageForm: Attempting wallet refresh due to missing signer...');
        toast.loading('Refreshing wallet connection...', { id: 'wallet-refresh' });

        try {
          const refreshResult = await refreshWallet(account!, { showToasts: false });

          if (refreshResult.success && refreshResult.signer) {
            console.log('PackageForm: Wallet refresh successful, using refreshed signer');
            toast.success('Wallet connection refreshed', { id: 'wallet-refresh' });

            // Use the refreshed signer for the transaction
            const contracts = getContracts(refreshResult.signer);

            // CRITICAL FIX: Use USDT decimals (6) instead of 18 decimals for package creation
            // This ensures the smart contract can properly transfer the USDT amount
            const packageData = {
              name: formData.name,
              entryUSDT: ethers.parseUnits(formData.entryUSDT, 6), // Use 6 decimals for USDT
              exchangeRate: decimalToExchangeRate(formData.exchangeRate),
              vestBps: percentageToBps(formData.vestPercentage),
              cliff: timeUnitsToSeconds(formData.cliffYears, formData.cliffMonths, formData.cliffDays),
              duration: timeUnitsToSeconds(formData.durationYears, formData.durationMonths, formData.durationDays),
              referralBps: percentageToBps(formData.referralPercentage),
            };

            const tx = await contracts.packageManager.addPackage(
              packageData.name,
              packageData.entryUSDT,
              packageData.exchangeRate,
              packageData.vestBps,
              packageData.cliff,
              packageData.duration,
              packageData.referralBps
            );

            toast.loading(pkg ? 'Updating package...' : 'Creating package...', { id: 'package' });
            await tx.wait();
            toast.success(pkg ? 'Package updated successfully!' : 'Package created successfully!', { id: 'package' });

            onSuccess();
            return;
          } else {
            console.warn('PackageForm: Wallet refresh failed:', refreshResult.error);
            toast.error('Failed to refresh wallet connection', { id: 'wallet-refresh' });
          }
        } catch (refreshError) {
          console.error('PackageForm: Wallet refresh error:', refreshError);
          toast.error('Error refreshing wallet connection', { id: 'wallet-refresh' });
        }
      }

      // Comprehensive wallet validation using utility function
      const validation = await validateWalletForTransaction(
        signer,
        account,
        chainId
      );

      if (!validation.isValid) {
        // Handle wallet connection issues
        if (!isConnected || !account) {
          console.log('PackageForm: Wallet not connected, opening connection modal...');
          await connectWallet();
          return;
        }

        // Handle network issues
        if (!isCorrectNetwork) {
          console.log('PackageForm: Wrong network, attempting to switch...');
          const switched = await switchToCorrectNetwork();
          if (!switched) {
            throw new Error('Please switch to BSC Testnet to continue');
          }
          return;
        }

        // Handle other validation errors
        const errorMessage = validation.errors.length > 0 ? validation.errors[0] : 'Wallet validation failed';
        throw new Error(errorMessage);
      }

      // Comprehensive form validation
      if (!formData.name.trim()) {
        throw new Error('Package name is required');
      }
      if (!formData.entryUSDT || parseFloat(formData.entryUSDT) <= 0) {
        throw new Error('Entry USDT amount must be greater than 0');
      }

      // Validate exchange rate
      const exchangeRate = parseFloat(formData.exchangeRate || '0');
      if (isNaN(exchangeRate) || exchangeRate < 0.01) {
        throw new Error('Exchange rate must be at least 0.01 USDT per 1 BLOCKS');
      }

      // Validate vest percentage
      const vestPercentage = parseFloat(formData.vestPercentage || '0');
      if (isNaN(vestPercentage) || vestPercentage < 0 || vestPercentage > 100) {
        throw new Error('Vest percentage must be between 0 and 100%');
      }

      // Validate referral percentage
      const referralPercentage = parseFloat(formData.referralPercentage || '0');
      if (isNaN(referralPercentage) || referralPercentage < 0 || referralPercentage > 10) {
        throw new Error('Referral percentage must be between 0 and 10%');
      }

      // Validate cliff period
      const cliffYears = parseInt(formData.cliffYears || '0');
      const cliffMonths = parseInt(formData.cliffMonths || '0');
      const cliffDays = parseInt(formData.cliffDays || '0');
      if (isNaN(cliffYears) || isNaN(cliffMonths) || isNaN(cliffDays)) {
        throw new Error('Cliff period values must be valid numbers');
      }
      if (cliffMonths > 11) {
        throw new Error('Cliff months must be between 0 and 11');
      }
      if (cliffDays > 29) {
        throw new Error('Cliff days must be between 0 and 29');
      }

      // Validate vesting duration
      const durationYears = parseInt(formData.durationYears || '0');
      const durationMonths = parseInt(formData.durationMonths || '0');
      const durationDays = parseInt(formData.durationDays || '0');
      if (isNaN(durationYears) || isNaN(durationMonths) || isNaN(durationDays)) {
        throw new Error('Vesting duration values must be valid numbers');
      }
      if (durationMonths > 11) {
        throw new Error('Duration months must be between 0 and 11');
      }
      if (durationDays > 29) {
        throw new Error('Duration days must be between 0 and 29');
      }

      // Ensure vesting duration is greater than 0
      const totalDurationSeconds = timeUnitsToSeconds(formData.durationYears, formData.durationMonths, formData.durationDays);
      if (totalDurationSeconds <= 0) {
        throw new Error('Vesting duration must be greater than 0');
      }

      // Ensure cliff period is not longer than vesting duration
      const totalCliffSeconds = timeUnitsToSeconds(formData.cliffYears, formData.cliffMonths, formData.cliffDays);
      if (totalCliffSeconds >= totalDurationSeconds) {
        throw new Error('Cliff period cannot be longer than or equal to vesting duration');
      }

      const contracts = getContracts(signer);

      // CRITICAL FIX: Use USDT decimals (18) for V2 architecture package creation
      // This ensures consistency with the V2 18-decimal USDT system
      const packageData = {
        name: formData.name.trim(),
        entryUSDT: ethers.parseUnits(formData.entryUSDT, 18), // Use 18 decimals for V2 USDT
        exchangeRate: decimalToExchangeRate(formData.exchangeRate),
        vestBps: percentageToBps(formData.vestPercentage),
        cliff: timeUnitsToSeconds(formData.cliffYears, formData.cliffMonths, formData.cliffDays),
        duration: timeUnitsToSeconds(formData.durationYears, formData.durationMonths, formData.durationDays),
        referralBps: percentageToBps(formData.referralPercentage),
      };

      const tx = await contracts.packageManager.addPackage(
        packageData.name,
        packageData.entryUSDT,
        packageData.exchangeRate,
        packageData.vestBps,
        packageData.cliff,
        packageData.duration,
        packageData.referralBps
      );

      toast.loading(pkg ? 'Updating package...' : 'Creating package...', { id: 'package' });
      await tx.wait();
      toast.success(pkg ? 'Package updated successfully!' : 'Package created successfully!', { id: 'package' });
      
      onSuccess();
    } catch (error: any) {
      console.error('Package form error:', error);
      toast.error(error.message || 'Failed to save package', { id: 'package' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white rounded-2xl shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
          {/* Fixed Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <Dialog.Title className="text-2xl font-bold text-gray-900">
              {pkg ? 'Edit Package' : 'Create Package'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <form id="package-form" onSubmit={handleSubmit} className="h-full flex flex-col">
              {/* Form content in scrollable area */}
              <div className="space-y-6 flex-1">
                {/* Compact info section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Next package ID for new packages */}
                  {!pkg && nextPackageId !== null && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm font-medium text-blue-800">
                          Next ID: {nextPackageId}
                        </span>
                      </div>
                    </div>
                  )}


                </div>

                {/* Basic Package Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Package Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Package Name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Starter Package"
                      required
                    />

                    <Input
                      label="Entry Cost (USDT)"
                      type="number"
                      step="0.01"
                      value={formData.entryUSDT}
                      onChange={(e) => setFormData(prev => ({ ...prev, entryUSDT: e.target.value }))}
                      placeholder="1000"
                      required
                    />

                    <div>
                      <Input
                        label="Exchange Rate (USDT per 1 BLOCKS)"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        value={formData.exchangeRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, exchangeRate: e.target.value }))}
                        placeholder="2.0"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Exchange rate for user token allocation (e.g., 2.0 = 2.0 USDT per 1 BLOCKS). This determines how many BLOCKS tokens users receive.
                      </p>
                    </div>

                    <div>
                      <Input
                        label="Vest Percentage (%)"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.vestPercentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, vestPercentage: e.target.value }))}
                        placeholder="70"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Tokens vested (locked). Rest goes to liquidity.
                      </p>
                    </div>

                    <div>
                      <Input
                        label="Referral Bonus (%)"
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={formData.referralPercentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, referralPercentage: e.target.value }))}
                        placeholder="2"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Bonus for referrers. Max 10%.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vesting Schedule */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Vesting Schedule
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Cliff Period */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-900">Cliff Period</h4>
                        <p className="text-xs text-gray-600">
                          Lock time before vesting starts
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          label="Years"
                          type="number"
                          min="0"
                          value={formData.cliffYears}
                          onChange={(e) => setFormData(prev => ({ ...prev, cliffYears: e.target.value }))}
                          placeholder="1"
                        />
                        <Input
                          label="Months"
                          type="number"
                          min="0"
                          max="11"
                          value={formData.cliffMonths}
                          onChange={(e) => setFormData(prev => ({ ...prev, cliffMonths: e.target.value }))}
                          placeholder="0"
                        />
                        <Input
                          label="Days"
                          type="number"
                          min="0"
                          max="29"
                          value={formData.cliffDays}
                          onChange={(e) => setFormData(prev => ({ ...prev, cliffDays: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Vesting Duration */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-900">Vesting Duration</h4>
                        <p className="text-xs text-gray-600">
                          Time for gradual token release
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          label="Years"
                          type="number"
                          min="0"
                          value={formData.durationYears}
                          onChange={(e) => setFormData(prev => ({ ...prev, durationYears: e.target.value }))}
                          placeholder="5"
                          required
                        />
                        <Input
                          label="Months"
                          type="number"
                          min="0"
                          max="11"
                          value={formData.durationMonths}
                          onChange={(e) => setFormData(prev => ({ ...prev, durationMonths: e.target.value }))}
                          placeholder="0"
                        />
                        <Input
                          label="Days"
                          type="number"
                          min="0"
                          max="29"
                          value={formData.durationDays}
                          onChange={(e) => setFormData(prev => ({ ...prev, durationDays: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Package Preview</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vest:</span>
                      <span className="font-medium">{parseFloat(formData.vestPercentage || '0').toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">LP:</span>
                      <span className="font-medium">{(100 - parseFloat(formData.vestPercentage || '0')).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Referral:</span>
                      <span className="font-medium">{parseFloat(formData.referralPercentage || '0').toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cliff:</span>
                      <span className="font-medium">
                        {formData.cliffYears}y {formData.cliffMonths}m {formData.cliffDays}d
                      </span>
                    </div>
                    <div className="flex justify-between md:col-span-2">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">
                        {formData.durationYears}y {formData.durationMonths}m {formData.durationDays}d
                      </span>
                    </div>
                  </div>
                </div>

                {/* Wallet Connection Status */}
                <div className="space-y-3">
                  {!isConnected && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm font-medium text-yellow-800">
                          Wallet not connected
                        </span>
                      </div>
                    </div>
                  )}

                  {isConnected && !isCorrectNetwork && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm font-medium text-orange-800">
                          Wrong network - Switch to BSC Testnet
                        </span>
                      </div>
                    </div>
                  )}

                  {isConnected && isCorrectNetwork && account && !signer && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                          <span className="text-sm font-medium text-yellow-800">
                            Signer not available
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleWalletRefresh}
                          loading={refreshing}
                        >
                          Refresh
                        </Button>
                      </div>
                    </div>
                  )}

                  {isConnected && isCorrectNetwork && account && signer && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm font-medium text-green-800">
                          Ready - {account.slice(0, 6)}...{account.slice(-4)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Fixed Footer with Action Buttons */}
          <div className="flex-shrink-0 border-t border-gray-200 p-6">
            <div className="flex space-x-3">
              <Button
                type="submit"
                form="package-form"
                loading={loading}
                disabled={!isConnected || !isCorrectNetwork || !signer}
                className="flex-1"
              >
                {pkg ? 'Update Package' : 'Create Package'}
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}