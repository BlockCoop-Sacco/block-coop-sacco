import React, { ReactNode, useEffect, useCallback, useRef } from 'react';
import { Header } from './Header';
import { Toaster } from 'react-hot-toast';
import { useRefreshContext } from '../../contexts/RefreshContext';
import { useWeb3 } from '../../providers/Web3Provider';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { account, isConnected, contracts } = useWeb3();
  const { refreshPackageData, refreshVestingData, refreshBalances } = useRefreshContext();

  // Debounce timer ref to prevent excessive refresh calls
  const debounceTimerRef = useRef<number | null>(null);

  // Debounced refresh function
  const debouncedRefresh = useCallback(async (refreshType: 'purchase' | 'redeem') => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(async () => {
      try {
        console.log(`Refreshing data after ${refreshType} event...`);

        if (refreshType === 'purchase') {
          // After purchase: refresh package data, balances, and vesting info
          await Promise.all([
            refreshPackageData(),
            refreshBalances(),
            refreshVestingData()
          ]);
        } else if (refreshType === 'redeem') {
          // After redemption: refresh balances and vesting info
          await Promise.all([
            refreshBalances(),
            refreshVestingData()
          ]);
        }

        console.log(`Data refresh completed after ${refreshType}`);
      } catch (error) {
        console.error(`Error refreshing data after ${refreshType}:`, error);
      }
    }, 1000); // 1 second debounce
  }, [refreshPackageData, refreshVestingData, refreshBalances]);

  // Set up event listeners for blockchain events
  useEffect(() => {
    if (!isConnected || !account) {
      return;
    }

    console.log('Setting up blockchain event listeners...');

    // Listen for package purchases (correct event name is 'PackagePurchased')
    const handlePackagePurchased = (buyer: string, packageId: any, usdtAmount: any, blocksAmount: any, lpTokens: any, referralReward: any) => {
      console.log('Package purchased event:', {
        buyer,
        packageId: packageId.toString(),
        usdtAmount: usdtAmount.toString(),
        blocksAmount: blocksAmount.toString(),
        lpTokens: lpTokens.toString(),
        referralReward: referralReward.toString()
      });

      // Only refresh if the current user made the purchase
      if (buyer.toLowerCase() === account.toLowerCase()) {
        debouncedRefresh('purchase');
      }
    };

    // Subscribe to events if contract is available
    if (contracts.packageManager) {
      try {
        // Use the correct event name 'PackagePurchased'
        contracts.packageManager.on('PackagePurchased', handlePackagePurchased);
        console.log('Successfully subscribed to PackagePurchased events');
      } catch (error) {
        console.warn('Failed to subscribe to PackagePurchased events:', error);
      }
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up blockchain event listeners...');
      if (contracts.packageManager) {
        try {
          contracts.packageManager.removeListener('PackagePurchased', handlePackagePurchased);
          console.log('Successfully cleaned up PackagePurchased event listener');
        } catch (error) {
          console.warn('Error cleaning up PackagePurchased event listener:', error);
        }
      }

      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isConnected, account, contracts.packageManager, debouncedRefresh]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            fontSize: '14px',
            padding: '12px 16px',
            borderRadius: '8px',
            maxWidth: '90vw',
            wordBreak: 'break-word',
          },
          // Mobile-specific positioning
          className: 'top-16 sm:top-4',
        }}
        containerStyle={{
          top: '4rem', // Account for header height on mobile
        }}
      />
    </div>
  );
}