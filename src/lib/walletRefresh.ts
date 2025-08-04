import React, { useCallback, useRef } from 'react';
import { useWeb3 } from '../providers/Web3Provider';
import { shouldAttemptWalletRefresh, debugWalletState } from './walletValidation';

// Wallet refresh hook interface
export interface WalletRefreshHook {
  refreshWallet: () => Promise<boolean>;
  isRefreshing: boolean;
  lastRefreshAttempt: number | null;
}

// Custom hook for wallet refresh functionality
export function useWalletRefresh(): WalletRefreshHook {
  const { 
    refreshConnection, 
    isConnected, 
    account, 
    signer, 
    provider,
    chainId,
    error 
  } = useWeb3();
  
  const isRefreshingRef = useRef(false);
  const lastRefreshAttemptRef = useRef<number | null>(null);

  const refreshWallet = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent refresh attempts
    if (isRefreshingRef.current) {
      console.log('🔄 Wallet refresh already in progress, skipping...');
      return false;
    }

    // Check if refresh should be attempted
    if (!shouldAttemptWalletRefresh(isConnected, account, signer, lastRefreshAttemptRef.current)) {
      console.log('🔄 Wallet refresh not needed or too frequent, skipping...');
      return false;
    }

    isRefreshingRef.current = true;
    lastRefreshAttemptRef.current = Date.now();

    try {
      console.log('🔄 Attempting wallet refresh...');
      
      // Debug current state before refresh
      await debugWalletState(provider, signer, account, chainId);
      
      // Attempt to refresh the connection
      await refreshConnection();
      
      // Small delay to allow state to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Wallet refresh completed');
      return true;
    } catch (error) {
      console.error('❌ Wallet refresh failed:', error);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [isConnected, account, signer, provider, chainId, refreshConnection]);

  return {
    refreshWallet,
    isRefreshing: isRefreshingRef.current,
    lastRefreshAttempt: lastRefreshAttemptRef.current,
  };
}

// Utility function to check if wallet refresh should be attempted (exported for external use)
export { shouldAttemptWalletRefresh };

// Auto-refresh hook that automatically refreshes wallet when needed
export function useAutoWalletRefresh(enabled: boolean = true) {
  const { refreshWallet } = useWalletRefresh();
  const { isConnected, account, signer, error } = useWeb3();
  const autoRefreshTimeoutRef = useRef<number | null>(null);

  const scheduleAutoRefresh = useCallback(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (autoRefreshTimeoutRef.current) {
      clearTimeout(autoRefreshTimeoutRef.current);
    }

    // Schedule refresh if conditions are met
    if (isConnected && !signer && !error) {
      console.log('📅 Scheduling auto wallet refresh in 3 seconds...');
      autoRefreshTimeoutRef.current = window.setTimeout(() => {
        refreshWallet();
      }, 3000);
    }
  }, [enabled, isConnected, signer, error, refreshWallet]);

  // Effect to handle auto-refresh scheduling
  React.useEffect(() => {
    scheduleAutoRefresh();

    return () => {
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }
    };
  }, [scheduleAutoRefresh]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }
    };
  }, []);
}

// Network refresh utilities
export async function refreshNetworkConnection(provider: any): Promise<boolean> {
  try {
    console.log('🌐 Refreshing network connection...');
    
    if (provider && typeof provider.request === 'function') {
      // Request account access to refresh connection
      await provider.request({ method: 'eth_requestAccounts' });
      
      // Get current network
      const chainId = await provider.request({ method: 'eth_chainId' });
      console.log('🌐 Current network chain ID:', chainId);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Network refresh failed:', error);
    return false;
  }
}

// Force wallet reconnection
export async function forceWalletReconnection(): Promise<boolean> {
  try {
    console.log('🔌 Forcing wallet reconnection...');
    
    // Check if ethereum provider is available
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const provider = (window as any).ethereum;
      
      // Request accounts to trigger connection
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      
      if (accounts && accounts.length > 0) {
        console.log('✅ Wallet reconnection successful');
        return true;
      }
    }
    
    console.log('❌ No wallet provider available');
    return false;
  } catch (error) {
    console.error('❌ Force reconnection failed:', error);
    return false;
  }
}

// Wallet connection health check
export async function performWalletHealthCheck(
  provider: any,
  signer: any,
  account: string | null
): Promise<{ isHealthy: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    // Check provider
    if (!provider) {
      issues.push('No provider available');
    }

    // Check signer
    if (!signer) {
      issues.push('No signer available');
    }

    // Check account
    if (!account) {
      issues.push('No account connected');
    }

    // Check if signer can sign (basic test)
    if (signer && account) {
      try {
        const signerAddress = await signer.getAddress();
        if (signerAddress.toLowerCase() !== account.toLowerCase()) {
          issues.push('Signer address mismatch');
        }
      } catch (error) {
        issues.push('Signer verification failed');
      }
    }

    // Check network connectivity
    if (provider) {
      try {
        await provider.getNetwork();
      } catch (error) {
        issues.push('Network connectivity issues');
      }
    }

    return {
      isHealthy: issues.length === 0,
      issues,
    };
  } catch (error) {
    issues.push('Health check failed');
    return {
      isHealthy: false,
      issues,
    };
  }
}
