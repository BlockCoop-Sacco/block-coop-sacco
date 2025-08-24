import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useWeb3 } from '../providers/Web3Provider';

// Refresh context interface
export interface RefreshContextState {
  refreshPackageData: () => Promise<void>;
  refreshVestingData: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  refreshPurchaseHistory: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

// Create the context
const RefreshContext = createContext<RefreshContextState | null>(null);

// Provider component props
interface RefreshProviderProps {
  children: ReactNode;
}

// RefreshProvider component
export function RefreshProvider({ children }: RefreshProviderProps) {
  const { contracts, account, isConnected } = useWeb3();

  // Refresh package data
  const refreshPackageData = useCallback(async () => {
    try {
      if (!contracts.packageManager) {
        console.warn('Package manager contract not available');
        return;
      }

      console.log('🔄 Refreshing package data...');
      
      // Trigger package data refresh by emitting a custom event
      // Components can listen to this event to refresh their data
      window.dispatchEvent(new CustomEvent('refreshPackageData', {
        detail: { timestamp: Date.now() }
      }));
      
      console.log('✅ Package data refresh triggered');
    } catch (error) {
      console.error('Failed to refresh package data:', error);
    }
  }, [contracts.packageManager]);

  // Refresh vesting data
  const refreshVestingData = useCallback(async () => {
    try {
      if (!contracts.vestingVault || !account) {
        console.warn('Vesting vault contract or account not available');
        return;
      }

      console.log('🔄 Refreshing vesting data...');
      
      // Trigger vesting data refresh
      window.dispatchEvent(new CustomEvent('refreshVestingData', {
        detail: { account, timestamp: Date.now() }
      }));
      
      console.log('✅ Vesting data refresh triggered');
    } catch (error) {
      console.error('Failed to refresh vesting data:', error);
    }
  }, [contracts.vestingVault, account]);

  // Refresh balance data
  const refreshBalances = useCallback(async () => {
    try {
      if (!account || !isConnected) {
        console.warn('Account not available for balance refresh');
        return;
      }

      console.log('🔄 Refreshing balance data...');
      
      // Trigger balance refresh
      window.dispatchEvent(new CustomEvent('refreshBalances', {
        detail: { account, timestamp: Date.now() }
      }));
      
      console.log('✅ Balance data refresh triggered');
    } catch (error) {
      console.error('Failed to refresh balance data:', error);
    }
  }, [account, isConnected]);

  // Refresh purchase history data
  const refreshPurchaseHistory = useCallback(async () => {
    try {
      if (!account || !isConnected) {
        console.warn('Account or connection not available for purchase history refresh');
        return;
      }

      console.log('🔄 Refreshing purchase history data...');

      // Trigger purchase history refresh by emitting a custom event
      window.dispatchEvent(new CustomEvent('refreshPurchaseHistory', {
        detail: { account, timestamp: Date.now() }
      }));

      console.log('✅ Purchase history data refresh triggered');
    } catch (error) {
      console.error('Failed to refresh purchase history data:', error);
    }
  }, [account, isConnected]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    console.log('🔄 Refreshing all data...');

    await Promise.all([
      refreshPackageData(),
      refreshVestingData(),
      refreshBalances(),
      refreshPurchaseHistory(),
    ]);

    // Trigger global refresh event
    window.dispatchEvent(new CustomEvent('refreshAll', {
      detail: { timestamp: Date.now() }
    }));

    console.log('✅ All data refresh completed');
  }, [refreshPackageData, refreshVestingData, refreshBalances, refreshPurchaseHistory]);

  // Context value
  const contextValue: RefreshContextState = {
    refreshPackageData,
    refreshVestingData,
    refreshBalances,
    refreshPurchaseHistory,
    refreshAll,
  };

  return (
    <RefreshContext.Provider value={contextValue}>
      {children}
    </RefreshContext.Provider>
  );
}

// Hook to use refresh context
export function useRefreshContext(): RefreshContextState {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefreshContext must be used within a RefreshProvider');
  }
  return context;
}

// Custom hook for listening to refresh events
export function useRefreshListener(
  eventType: 'refreshPackageData' | 'refreshVestingData' | 'refreshBalances' | 'refreshAll' | 'refreshPoolInfo' | 'refreshPurchaseHistory' | 'refreshPortfolioStats',
  callback: (detail: any) => void
) {
  React.useEffect(() => {
    const handleRefresh = (event: CustomEvent) => {
      callback(event.detail);
    };

    window.addEventListener(eventType, handleRefresh as EventListener);
    
    return () => {
      window.removeEventListener(eventType, handleRefresh as EventListener);
    };
  }, [eventType, callback]);
}

// Utility hook for automatic data refresh on blockchain events
export function useBlockchainEventRefresh() {
  const { refreshAll } = useRefreshContext();
  const { contracts, account } = useWeb3();

  React.useEffect(() => {
    if (!contracts.packageManager || !account) return;

    const handlePurchased = () => {
      console.log('📦 Package purchased event detected, refreshing data...');
      refreshAll();
    };

    const handleRedeemed = () => {
      console.log('💰 Redeem event detected, refreshing data...');
      refreshAll();
    };

    const handleClaimed = () => {
      console.log('🎯 Claim event detected, refreshing data...');
      refreshAll();
    };

    // Subscribe to contract events
    contracts.packageManager.on('Purchased', handlePurchased);
    contracts.packageManager.on('Redeemed', handleRedeemed);
    
    if (contracts.vestingVault) {
      contracts.vestingVault.on('Claimed', handleClaimed);
    }

    return () => {
      // Cleanup event listeners
      contracts.packageManager.removeListener('Purchased', handlePurchased);
      contracts.packageManager.removeListener('Redeemed', handleRedeemed);
      
      if (contracts.vestingVault) {
        contracts.vestingVault.removeListener('Claimed', handleClaimed);
      }
    };
  }, [contracts.packageManager, contracts.vestingVault, account, refreshAll]);
}
