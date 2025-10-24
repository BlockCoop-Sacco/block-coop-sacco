import { createAppKit } from '@reown/appkit';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { bsc } from '@reown/appkit/networks';

// ============================================================================
// UNIFIED BLOCKCHAIN CONFIGURATION
// ============================================================================
// This file serves as the single source of truth for all blockchain-related
// configuration, replacing the previous config.ts approach for better
// maintainability and reduced complexity.

// Environment variable validation and loading
function getEnvVar(key: string, required: boolean = true): string {
  const value = import.meta.env[key];
  console.log(`🔍 getEnvVar(${key}, ${required}):`, { value, type: typeof value, truthy: !!value });
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

export const BSC_MAINNET = {
  chainId: 56,
  name: 'BSC Mainnet',
  currency: 'BNB',
  explorerUrl: 'https://bscscan.com',
  rpcUrl: 'https://bsc-dataseed1.binance.org',
  // Backup RPC endpoints for failover
  rpcUrls: [
    'https://bsc-dataseed1.binance.org',
    'https://bsc-dataseed2.binance.org',
    'https://bsc-dataseed3.binance.org',
    'https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3',
    'https://bsc-dataseed1.defibit.io',
    'https://bsc-dataseed1.ninicoin.io'
  ]
};

// Supported networks
export const SUPPORTED_NETWORKS = [BSC_MAINNET];
export const SUPPORTED_CHAIN_IDS = [56];

// Contract addresses configuration
export interface ContractAddresses {
  usdt: string;
  share: string;
  lp: string;
  vault: string;
  taxManager: string;
  router: string;
  factory: string;
  packageManager: string;
  dividendDistributor?: string;
  secondaryMarket?: string;
  staking?: string;
}

// Main configuration object
export interface AppKitConfig {
  chainId: number;
  rpcUrl: string;
  walletConnectProjectId: string;
  contracts: ContractAddresses;
  network: {
    name: string;
    currency: string;
    explorerUrl: string;
  };
}

// Debug environment variables
const stakingAddress = getEnvVar('VITE_STAKING_ADDRESS', false);
console.log('🔧 AppKit Environment Debug:', {
  VITE_STAKING_ADDRESS: stakingAddress,
  VITE_STAKING_ENABLED: getEnvVar('VITE_STAKING_ENABLED', false),
  stakingAddressLength: stakingAddress.length,
  stakingAddressTruthy: !!stakingAddress,
  allStakingVars: Object.keys(import.meta.env).filter(key => key.includes('STAKING'))
});

// Get current network configuration (Mainnet only)
function getCurrentNetworkConfig() {
  return BSC_MAINNET;
}

// Load configuration from environment variables
export const appKitConfig: AppKitConfig = {
  chainId: 56,
  rpcUrl: getEnvVar('VITE_BSC_RPC_URL', false) || getCurrentNetworkConfig().rpcUrl,
  walletConnectProjectId: getEnvVar('VITE_WALLETCONNECT_PROJECT_ID', true) || 'c4f79cc821944d9680842e34466bfbd',
  contracts: {
    usdt: getEnvVar('VITE_USDT_ADDRESS', true),
    share: getEnvVar('VITE_SHARE_ADDRESS', true),
    lp: getEnvVar('VITE_LP_ADDRESS', true),
    vault: getEnvVar('VITE_VAULT_ADDRESS', true),
    taxManager: getEnvVar('VITE_TAX_ADDRESS', true),
    router: getEnvVar('VITE_ROUTER_ADDRESS', true),
    factory: getEnvVar('VITE_FACTORY_ADDRESS', true),
    packageManager: getEnvVar('VITE_PACKAGE_MANAGER_ADDRESS', true),
    staking: stakingAddress,
    secondaryMarket: getEnvVar('VITE_SECONDARY_MARKET_ADDRESS', false),
  },
  network: getCurrentNetworkConfig(),
};

// Validation functions
export function isValidProjectId(projectId: string): boolean {
  return /^[a-f0-9]{32}$/.test(projectId);
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Configuration validation
export function validateAppKitConfig(): string[] {
  const errors: string[] = [];

  // Validate chain ID
  if (!appKitConfig.chainId || !SUPPORTED_CHAIN_IDS.includes(appKitConfig.chainId)) {
    errors.push(`Invalid chain ID: ${appKitConfig.chainId}. Expected: 56 (BSC Mainnet)`);
  }

  // Validate RPC URL
  if (!appKitConfig.rpcUrl) {
    errors.push('RPC URL is not configured');
  }

  // Validate WalletConnect Project ID
  if (!isValidProjectId(appKitConfig.walletConnectProjectId)) {
    errors.push('Invalid or missing WalletConnect Project ID');
  }

  // Validate contract addresses
  Object.entries(appKitConfig.contracts).forEach(([name, address]) => {
    if (!isValidAddress(address)) {
      errors.push(`Invalid ${name} contract address: ${address}`);
    }
  });

  return errors;
}

// Export commonly used values for backward compatibility
export const CHAIN_ID = appKitConfig.chainId;
export const RPC_URL = appKitConfig.rpcUrl;
export const PROJECT_ID = appKitConfig.walletConnectProjectId;
export const CONTRACT_ADDRESSES = appKitConfig.contracts;

// PancakeSwap URL utilities
export const PANCAKESWAP_BASE_URL = 'https://pancakeswap.finance';

export function getPancakeSwapUrl(type: 'swap' | 'add' | 'info/pools', inputCurrency?: string, outputCurrency?: string, lpToken?: string): string {
  const baseUrl = PANCAKESWAP_BASE_URL;

  switch (type) {
    case 'swap':
      if (!inputCurrency || !outputCurrency) {
        throw new Error('Both inputCurrency and outputCurrency are required for swap URL');
      }
      return `${baseUrl}/swap?inputCurrency=${inputCurrency}&outputCurrency=${outputCurrency}`;

    case 'add':
      if (!inputCurrency || !outputCurrency) {
        throw new Error('Both inputCurrency and outputCurrency are required for add liquidity URL');
      }
      return `${baseUrl}/add/${inputCurrency}/${outputCurrency}`;

    case 'info/pools':
      if (!lpToken) {
        throw new Error('LP token address is required for pool info URL');
      }
      return `${baseUrl}/info/pools/${lpToken}`;

    default:
      throw new Error(`Unsupported PancakeSwap URL type: ${type}`);
  }
}

// Create the Ethers adapter for AppKit
const ethersAdapter = new EthersAdapter();

// AppKit metadata configuration
const metadata = {
  name: 'BlockCoop Sacco',
  description: 'Sophisticated investment packages with advanced splitting mechanisms, vesting schedules, and secondary market integration on BSC.',
  url: import.meta.env.DEV ? 'http://localhost:5173' : 'http://shares.blockcoopsacco.com/',
  icons: [import.meta.env.DEV ? 'http://localhost:5173/vite.svg' : 'https://blockcoop.com/icon.png'],
};

// Get default network (Mainnet only)
function getDefaultNetwork() {
  return bsc;
}

// AppKit instance configuration
const appKitInstanceConfig = {
  adapters: [ethersAdapter],
  networks: [bsc],
  defaultNetwork: bsc,
  projectId: appKitConfig.walletConnectProjectId,
  metadata,
  features: {
    analytics: false, // Disable analytics for testing
    email: true, // Enable email login
    socials: ['google'], // Enable Google/Gmail social login
    emailShowWallets: true,
    onramp: false, // Disable onramp
    swaps: false, // Disable swaps
    history: false, // Disable history
  },
  themeMode: 'light' as const,
  themeVariables: {
    '--w3m-color-mix': '#3b82f6',
    '--w3m-color-mix-strength': 20,
    '--w3m-accent': '#3b82f6',
    '--w3m-border-radius-master': '8px',
  },
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: true,
  // Simplified configuration for better OAuth reliability
  allowUnsupportedChain: false,
  allWallets: 'SHOW', // Show all wallets for now
  includeWalletIds: [], // Include all wallets
  excludeWalletIds: [], // Don't exclude any
  // Extended timeout for OAuth flows
  connectTimeout: 60000, // 60 seconds timeout
};

// Create and export the AppKit instance
let appKit: any;

try {
  // Only log in development mode to reduce production noise
  if (import.meta.env.DEV) {
    console.log('🔧 Creating AppKit with config:', {
      projectId: appKitConfig.walletConnectProjectId.substring(0, 8) + '...',
      chainId: appKitConfig.chainId,
      networks: [bsc.name],
      defaultNetwork: 'BSC Mainnet',
      adapters: ['EthersAdapter'],
      hasValidProjectId: isValidProjectId(appKitConfig.walletConnectProjectId)
    });
  }

  appKit = createAppKit(appKitInstanceConfig as any);

  if (import.meta.env.DEV) {
    console.log('✅ AppKit created successfully');
  }
} catch (error) {
  console.error('❌ Failed to create AppKit:', error);
  throw error;
}

export { appKit };

// Add event listeners only in development mode to reduce production overhead
if (import.meta.env.DEV) {
  // Add event listeners to debug AppKit state changes
  appKit.subscribeState((state: any) => {
    console.log('🔄 AppKit state changed:', state);
  });

  // Add enhanced debugging for social login issues
  if (appKit.subscribeEvents) {
    appKit.subscribeEvents((event: any) => {
      console.log('🔔 AppKit event:', event);

      if (event.type === 'SOCIAL_LOGIN_ERROR') {
        console.error('❌ Social login error:', event.data);
      }

      if (event.type === 'SOCIAL_LOGIN_TIMEOUT') {
        console.error('⏰ Social login timeout:', event.data);
      }

      if (event.type === 'OAUTH_ERROR') {
        console.error('🔐 OAuth error:', event.data);
      }
    });
  }
}

// Utility functions for AppKit management
export function openAppKit() {
  appKit.open();
}

export function closeAppKit() {
  appKit.close();
}

export function getAppKitState() {
  return appKit.getState();
}

// Subscribe to AppKit events
export function subscribeToAppKitEvents(callback: (state: any) => void) {
  return appKit.subscribeState(callback);
}

// Network switching utilities
export async function switchToCorrectNetwork() {
  try {
    const targetNetwork = getDefaultNetwork();
    await appKit.switchNetwork(targetNetwork);
    return true;
  } catch (error) {
    console.error('Failed to switch network:', error);
    return false;
  }
}

// Switch to specific network
export async function switchToNetwork(chainId: number) {
  try {
    const targetNetwork = bsc;
    await appKit.switchNetwork(targetNetwork);
    return true;
  } catch (error) {
    console.error('Failed to switch to network:', chainId, error);
    return false;
  }
}

// Connection utilities
export async function connectWallet() {
  try {
    appKit.open();
    return true;
  } catch (error) {
    console.error('Failed to open wallet connection modal:', error);
    return false;
  }
}

export async function disconnectWallet() {
  try {
    await appKit.disconnect();
    return true;
  } catch (error) {
    console.error('Failed to disconnect wallet:', error);
    return false;
  }
}

// Debug logging for AppKit (only in development)
if (import.meta.env.DEV) {
  console.log('🔗 AppKit initialized with unified config:', {
    projectId: appKitConfig.walletConnectProjectId.substring(0, 8) + '...',
    network: 'BSC Mainnet',
    chainId: 56,
    features: appKitInstanceConfig.features,
    contracts: Object.keys(appKitConfig.contracts),
  });

  // Validate configuration on startup
  const configErrors = validateAppKitConfig();
  if (configErrors.length > 0) {
    console.error('🚨 AppKit configuration errors:', configErrors);
  } else {
    console.log('✅ AppKit configuration validated successfully');
  }

  // Subscribe to state changes for debugging
  appKit.subscribeState((state: any) => {
    console.log('🔗 AppKit state changed:', {
      isConnected: state.isConnected,
      address: state.address,
      chainId: state.chainId,
      selectedNetworkId: state.selectedNetworkId,
    });
  });
}
