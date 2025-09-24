import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContracts, getGlobalTargetPrice } from '../../lib/contracts';
import { useWeb3 } from '../../providers/Web3Provider';
import { validateWalletForTransaction } from '../../lib/walletValidation';
import { useWalletRefresh, shouldAttemptWalletRefresh } from '../../lib/walletRefresh';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Settings, DollarSign, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface GlobalTargetPriceManagerProps {
  onSuccess?: () => void;
}

export function GlobalTargetPriceManager({ onSuccess }: GlobalTargetPriceManagerProps) {
  const { isConnected, account, signer, chainId, contracts } = useWeb3();
  const { refreshWallet } = useWalletRefresh();

  const [currentGlobalTargetPrice, setCurrentGlobalTargetPrice] = useState<string>('');
  const [newGlobalTargetPrice, setNewGlobalTargetPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  // Helper functions for converting between user-friendly and contract formats
  const globalTargetPriceToDecimal = (globalTargetPrice: bigint): string => {
    return ethers.formatUnits(globalTargetPrice, 18); // Convert from wei to USDT (18 decimals for V2 architecture)
  };

  const decimalToGlobalTargetPrice = (decimal: string): bigint => {
    return ethers.parseUnits(decimal || '0', 18); // Convert to wei with 18-decimal precision for V2 architecture
  };

  // Load current global target price
  useEffect(() => {
    const loadCurrentGlobalTargetPrice = async () => {
      try {
        setLoadingCurrent(true);

        // Use contracts from Web3Provider context, fallback to read-only contracts
        const contractsToUse = contracts.packageManager || getContracts().packageManager;

        if (!contractsToUse) {
          console.error('PackageManager contract not available');
          toast.error('PackageManager contract not available');
          return;
        }

        // Graceful read with fallback
        let price: bigint;
        try {
          price = await contractsToUse.globalTargetPrice();
        } catch (e) {
          price = await getGlobalTargetPrice();
        }
        const decimal = globalTargetPriceToDecimal(price);
        setCurrentGlobalTargetPrice(decimal);
      } catch (error: any) {
        console.error('Error loading global target price:', error);
        toast.error('Failed to load current global target price');
      } finally {
        setLoadingCurrent(false);
      }
    };

    loadCurrentGlobalTargetPrice();
  }, [contracts.packageManager]);

  const handleUpdateGlobalTargetPrice = async () => {
    if (!isConnected || !account) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!signer) {
      toast.error('Wallet signer not available. Please reconnect your wallet.');
      return;
    }

    if (!newGlobalTargetPrice || parseFloat(newGlobalTargetPrice) <= 0) {
      toast.error('Please enter a valid global target price');
      return;
    }

    try {
      setLoading(true);

      // Validate wallet state with correct parameters
      const validationResult = await validateWalletForTransaction(signer, account, chainId);
      if (!validationResult.isValid) {
        if (shouldAttemptWalletRefresh(isConnected, account, signer, null)) {
          const refreshResult = await refreshWallet();
          if (refreshResult) {
            // Retry after refresh - wait a moment for state to update
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryValidation = await validateWalletForTransaction(signer, account, chainId);
            if (!retryValidation.isValid) {
              toast.error(`Wallet validation failed: ${retryValidation.errors.join(', ')}`);
              return;
            }
          } else {
            toast.error('Failed to refresh wallet connection');
            return;
          }
        } else {
          toast.error(`Wallet validation failed: ${validationResult.errors.join(', ')}`);
          return;
        }
      }

      // Use contracts from Web3Provider context (with signer)
      const contractsToUse = contracts.packageManager || getContracts(signer).packageManager;

      if (!contractsToUse) {
        toast.error('PackageManager contract not available');
        return;
      }

      const globalTargetPriceWei = decimalToGlobalTargetPrice(newGlobalTargetPrice);

      const tx = await contractsToUse.setGlobalTargetPrice(globalTargetPriceWei);

      toast.loading('Updating global target price...', { id: 'global-target-price' });
      await tx.wait();
      toast.success('Global target price updated successfully!', { id: 'global-target-price' });

      // Update current value and clear input
      setCurrentGlobalTargetPrice(newGlobalTargetPrice);
      setNewGlobalTargetPrice('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error updating global target price:', error);

      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction was rejected by user', { id: 'global-target-price' });
      } else if (error.message?.includes('revert')) {
        const revertReason = error.message.split('revert ')[1]?.split('"')[0] || 'Unknown error';
        toast.error(`Transaction failed: ${revertReason}`, { id: 'global-target-price' });
      } else {
        toast.error('Failed to update global target price', { id: 'global-target-price' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Settings className="h-8 w-8 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please connect your wallet to manage global target price</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Global Target Price Management</h3>
        </div>
        <div className="flex items-start space-x-2 mt-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            The global target price is used exclusively for liquidity pool operations. 
            It does not affect user-facing exchange rates, which are set per package.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Global Target Price */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Global Target Price</h4>
          {loadingCurrent ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-24"></div>
            </div>
          ) : (
            <p className="text-2xl font-bold text-gray-900">
              {currentGlobalTargetPrice} <span className="text-sm font-normal text-gray-600">USDT per BLOCKS</span>
            </p>
          )}
        </div>

        {/* Update Global Target Price */}
        <div className="space-y-4">
          <div>
            <Input
              label="New Global Target Price (USDT per 1 BLOCKS)"
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={newGlobalTargetPrice}
              onChange={(e) => setNewGlobalTargetPrice(e.target.value)}
              placeholder="2.0"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              This price is used for liquidity pool operations only. It does not affect user token allocations.
            </p>
          </div>

          <Button
            onClick={handleUpdateGlobalTargetPrice}
            disabled={loading || !newGlobalTargetPrice || parseFloat(newGlobalTargetPrice) <= 0}
            className="w-full"
          >
            {loading ? 'Updating...' : 'Update Global Target Price'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
