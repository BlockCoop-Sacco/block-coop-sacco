import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { BrowserProvider, Signer } from 'ethers';
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react';
import { appKit, connectWallet as openWalletModal, switchToCorrectNetwork, SUPPORTED_CHAIN_IDS } from '../lib/appkit';
import { getContracts } from '../lib/contracts';
import { bsc } from '@reown/appkit/networks';

// Web3 context state interface (Ethers v6)
export interface Web3ContextState {
  // Connection state
  isConnected: boolean;
  isInitializing: boolean;
  account: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;

  // Providers and signers
  provider: BrowserProvider | null;
  signer: Signer | null;
  
  // Contract instances
  contracts: {
    packageManager: any;
    vestingVault: any;
    taxManager: any;
    shareToken: any;
    lpToken: any;
    usdtToken: any;
    router: any;
    factory: any;
    dividendDistributor: any;
    secondaryMarket: any;
    staking: any;
  };
  
  // Actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchToCorrectNetwork: () => Promise<boolean>;
  refreshConnection: () => Promise<void>;
  
  // Error state
  error: string | null;
}

// Create the context
const Web3Context = createContext<Web3ContextState | null>(null);

// Provider component props
interface Web3ProviderProps {
  children: ReactNode;
}

// Web3Provider component (Ethers v6)
export function Web3Provider({ children }: Web3ProviderProps) {
  // Check if AppKit is properly initialized
  if (!appKit) {
    console.error('❌ AppKit not initialized! Cannot use Web3Provider.');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">AppKit Initialization Error</h2>
          <p className="text-gray-600">AppKit failed to initialize. Please check the console for details.</p>
        </div>
      </div>
    );
  }

  // AppKit hooks - Let's test the correct usage pattern
  const { walletProvider } = useAppKitProvider('eip155');
  const { address, isConnected: appKitIsConnected } = useAppKitAccount();
  const { chainId: appKitChainId } = useAppKitNetwork();

  // Debug logging only in development mode and when connection state changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔍 Web3Provider state update:', {
        isConnected: appKitIsConnected,
        account: address,
        chainId: appKitChainId,
        hasWalletProvider: !!walletProvider,
        timestamp: new Date().toISOString()
      });
    }
  }, [appKitIsConnected, address, appKitChainId, walletProvider]);

  // Window ethereum check only in development mode
  if (import.meta.env.DEV) {
    console.log('🔍 Window Ethereum:', {
      hasWindowEthereum: typeof window !== 'undefined' && !!(window as any).ethereum,
      windowEthereumType: typeof window !== 'undefined' ? typeof (window as any).ethereum : 'undefined'
    });
  }

  // Local state for ethers provider/signer and contracts (Ethers v6)
  const [isInitializing, setIsInitializing] = useState(true);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [contracts, setContracts] = useState<any>({
    packageManager: null,
    vestingVault: null,
    taxManager: null,
    shareToken: null,
    lpToken: null,
    usdtToken: null,
    router: null,
    factory: null,
    dividendDistributor: null,
    secondaryMarket: null,
  });
  const [error, setError] = useState<string | null>(null);

  // Derived state from AppKit hooks
  const isConnected = appKitIsConnected;
  const account = address;
  const chainId = appKitChainId ? (typeof appKitChainId === 'string' ? parseInt(appKitChainId) : appKitChainId) : null;
  const isCorrectNetwork = chainId ? SUPPORTED_CHAIN_IDS.includes(chainId) : false;

  // Initialize contracts when signer changes (Ethers v6)
  const initializeContracts = useCallback(async (currentSigner: Signer | null) => {
    try {
      console.log('🔧 Initializing contracts with signer:', !!currentSigner);

      if (currentSigner) {
        const contractInstances = getContracts(currentSigner);
        console.log('📋 Contract instances created with signer:', {
          packageManager: !!contractInstances.packageManager,
          packageManagerAddress: contractInstances.packageManager?.address,
          usdtToken: !!contractInstances.usdtToken,
          usdtTokenAddress: contractInstances.usdtToken?.address,
          vestingVault: !!contractInstances.vestingVault,
          taxManager: !!contractInstances.taxManager,
          shareToken: !!contractInstances.shareToken,
          lpToken: !!contractInstances.lpToken,
          router: !!contractInstances.router
        });

        setContracts({
          packageManager: contractInstances.packageManager,
          vestingVault: contractInstances.vestingVault,
          taxManager: contractInstances.taxManager,
          shareToken: contractInstances.shareToken,
          lpToken: contractInstances.lpToken,
          usdtToken: contractInstances.usdtToken,
          router: contractInstances.router,
          factory: contractInstances.factory,
          dividendDistributor: contractInstances.dividendDistributor,
          secondaryMarket: contractInstances.secondaryMarket,
          staking: contractInstances.staking,
        });
      } else {
        // Use read-only contracts when no signer
        console.log('📋 Creating read-only contracts');
        const readOnlyContracts = getContracts();
        console.log('📋 Read-only contract instances created:', {
          packageManager: !!readOnlyContracts.packageManager,
          packageManagerAddress: readOnlyContracts.packageManager?.address,
          usdtToken: !!readOnlyContracts.usdtToken,
          usdtTokenAddress: readOnlyContracts.usdtToken?.address
        });

        setContracts({
          packageManager: readOnlyContracts.packageManager,
          vestingVault: readOnlyContracts.vestingVault,
          taxManager: readOnlyContracts.taxManager,
          shareToken: readOnlyContracts.shareToken,
          lpToken: readOnlyContracts.lpToken,
          usdtToken: readOnlyContracts.usdtToken,
          router: readOnlyContracts.router,
          factory: readOnlyContracts.factory,
          dividendDistributor: readOnlyContracts.dividendDistributor,
          secondaryMarket: readOnlyContracts.secondaryMarket,
          staking: readOnlyContracts.staking,
        });
      }
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
      setError('Failed to initialize contracts');
    }
  }, []);

  // Update ethers provider and contracts based on AppKit state
  const updateEthersState = useCallback(async () => {
    try {
      if (isConnected && account) {
        console.log('🔗 Attempting Web3 connection:', {
          isConnected,
          account,
          chainId,
          hasWalletProvider: !!walletProvider,
          walletProviderType: typeof walletProvider
        });

        // Try to use AppKit's walletProvider first, fallback to window.ethereum
        let providerToUse: any = null;

        // Check if AppKit walletProvider is valid
        if (walletProvider && typeof walletProvider === 'object' && 'request' in walletProvider) {
          providerToUse = walletProvider;
          console.log('🎯 Using AppKit walletProvider');
        } else if (typeof window !== 'undefined' && (window as any).ethereum) {
          providerToUse = (window as any).ethereum;
          console.log('🔄 Falling back to window.ethereum');
        }

        if (!providerToUse) {
          console.warn('⚠️ No valid wallet provider available');
          setError('No wallet provider available');
          return;
        }

        // Create ethers provider and signer (Ethers v6)
        const ethersProvider = new BrowserProvider(providerToUse);
        const ethersSigner = await ethersProvider.getSigner();

        // Update local ethers state
        setProvider(ethersProvider);
        setSigner(ethersSigner);
        setError(null);

        // Initialize contracts with signer
        await initializeContracts(ethersSigner);

        console.log('✅ Web3 connection established:', {
          account,
          chainId,
          isCorrectNetwork: SUPPORTED_CHAIN_IDS.includes(chainId || 0),
          networkName: chainId === 56 ? 'BSC Mainnet' : 'Unknown',
          hasProvider: true,
          hasSigner: true,
          usedAppKitProvider: providerToUse === walletProvider
        });
      } else {
        // Disconnected state - clear ethers instances
        setProvider(null);
        setSigner(null);

        // Initialize read-only contracts
        await initializeContracts(null);

        console.log('❌ Web3 disconnected - missing requirements:', {
          isConnected,
          hasAccount: !!account,
          hasWalletProvider: !!walletProvider
        });
      }
    } catch (error) {
      console.error('Failed to update ethers state:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to update ethers state: ${errorMessage}`);
    }
  }, [isConnected, account, chainId, walletProvider, initializeContracts]);

  // Connect wallet function with enhanced error handling
  const connectWallet = useCallback(async () => {
    try {
      setError(null);
      await openWalletModal();
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);

      // Enhanced error handling for social login issues
      const errorMessage = error?.message || error?.toString() || 'Unknown error';

      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        setError('Connection timed out. Please check your internet connection and try again. If using social login, ensure popups are enabled.');
      } else if (errorMessage.includes('popup') || errorMessage.includes('blocked')) {
        setError('Popup blocked. Please disable popup blocker and try again.');
      } else if (errorMessage.includes('social login')) {
        setError('Social login failed. Please try again or use a different login method.');
      } else {
        setError('Failed to connect wallet. Please try again.');
      }
    }
  }, []);

  // Disconnect wallet function
  const disconnectWallet = useCallback(async () => {
    try {
      setError(null);
      await appKit.disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      setError('Failed to disconnect wallet');
    }
  }, []);

  // Switch to correct network function
  const switchNetwork = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      return await switchToCorrectNetwork();
    } catch (error) {
      console.error('Failed to switch network:', error);
      setError('Failed to switch network');
      return false;
    }
  }, []);

  // Refresh connection function
  const refreshConnection = useCallback(async () => {
    await updateEthersState();
  }, [updateEthersState]);

  // Initialize and update ethers state when AppKit state changes
  useEffect(() => {
    let mounted = true;

    const initializeWeb3 = async () => {
      try {
        setIsInitializing(true);

        // Initial ethers state update
        await updateEthersState();

        if (mounted) {
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('Failed to initialize Web3:', error);
        if (mounted) {
          setError('Failed to initialize Web3');
          setIsInitializing(false);
        }
      }
    };

    initializeWeb3();

    return () => {
      mounted = false;
    };
  }, [updateEthersState]);

  // Update ethers state when AppKit connection state changes
  useEffect(() => {
    updateEthersState();
  }, [updateEthersState]);

  // Context value
  const contextValue: Web3ContextState = {
    isConnected,
    isInitializing,
    account: account || null,
    chainId,
    isCorrectNetwork,
    provider,
    signer,
    contracts,
    connectWallet,
    disconnectWallet,
    switchToCorrectNetwork: switchNetwork,
    refreshConnection,
    error,
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
}

// Hook to use Web3 context
export function useWeb3(): Web3ContextState {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
