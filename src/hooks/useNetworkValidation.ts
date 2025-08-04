import { useState, useCallback, useEffect } from 'react';
import { useWeb3 } from '../providers/Web3Provider';
import { CHAIN_ID } from '../lib/appkit';
import { switchToCorrectNetwork } from '../lib/appkit';

// Network status interface
export interface NetworkStatus {
  status: 'connected' | 'wrong-network' | 'disconnected' | 'switching';
  message: string;
  chainId?: number;
  targetChainId: number;
}

// Network validation hook
export function useNetworkValidation() {
  const { chainId, isConnected, isCorrectNetwork } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const [lastSwitchAttempt, setLastSwitchAttempt] = useState<number>(0);

  // Target chain ID (BSC Testnet)
  const targetChainId = CHAIN_ID;
  const currentChainId = chainId;

  // Check if wallet supports network switching
  const canSwitch = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // Check if we have ethereum provider with request method
    const ethereum = (window as any).ethereum;
    return !!(ethereum && ethereum.request);
  }, []);

  // Get network status with detailed information
  const getNetworkStatus = useCallback((): NetworkStatus => {
    if (!isConnected) {
      return {
        status: 'disconnected',
        message: 'Wallet not connected',
        targetChainId,
      };
    }

    if (isLoading) {
      return {
        status: 'switching',
        message: 'Switching network...',
        chainId: currentChainId || undefined,
        targetChainId,
      };
    }

    if (!isCorrectNetwork) {
      const networkName = targetChainId === 56 ? 'BSC Mainnet' : 'BSC Testnet';
      return {
        status: 'wrong-network',
        message: `Connected to wrong network. Please switch to ${networkName} (Chain ID: ${targetChainId})`,
        chainId: currentChainId || undefined,
        targetChainId,
      };
    }

    const networkName = currentChainId === 56 ? 'BSC Mainnet' : 'BSC Testnet';
    return {
      status: 'connected',
      message: `Connected to ${networkName}`,
      chainId: currentChainId || undefined,
      targetChainId,
    };
  }, [isConnected, isCorrectNetwork, isLoading, currentChainId, targetChainId]);

  // Switch to correct network (BSC Testnet or Mainnet based on config)
  const switchToCorrectBSCNetwork = useCallback(async () => {
    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastSwitchAttempt < 2000) {
      console.log('Network switch attempt too soon, skipping');
      return false;
    }
    setLastSwitchAttempt(now);

    if (!canSwitch()) {
      console.warn('Network switching not supported by current wallet');
      return false;
    }

    setIsLoading(true);
    try {
      const networkName = targetChainId === 56 ? 'BSC Mainnet' : 'BSC Testnet';
      console.log(`Attempting to switch to ${networkName}...`);
      const success = await switchToCorrectNetwork();

      if (success) {
        console.log(`✅ Successfully switched to ${networkName}`);
        return true;
      } else {
        console.warn('❌ Failed to switch network');
        return false;
      }
    } catch (error) {
      console.error('Error switching network:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [canSwitch, lastSwitchAttempt, targetChainId]);

  // Auto-clear loading state if network changes
  useEffect(() => {
    if (isCorrectNetwork && isLoading) {
      setIsLoading(false);
    }
  }, [isCorrectNetwork, isLoading]);

  return {
    // Network state
    isCorrectNetwork,
    isConnected,
    currentChainId,
    targetChainId,
    
    // Loading state
    isLoading,
    
    // Functions
    switchToBSCTestnet: switchToCorrectBSCNetwork,
    switchToCorrectBSCNetwork,
    getNetworkStatus,
    canSwitch: canSwitch(),

    // Validation function for backward compatibility
    validateAndSwitchNetwork: switchToCorrectBSCNetwork,
    isValidating: isLoading,
  };
}

// Export for backward compatibility with existing useContracts.ts
export { useNetworkValidation as useNetworkValidationHook };
