import { ethers, Signer, BrowserProvider, formatUnits, formatEther } from 'ethers';
import { appKitConfig, CHAIN_ID } from './appkit';

// Wallet validation result interface
export interface WalletValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
}

// Wallet state interface for debugging
export interface WalletState {
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  hasSigner: boolean;
  hasProvider: boolean;
  balance: string | null;
}

// Validate wallet for transaction execution
export async function validateWalletForTransaction(
  signer: Signer | null,
  account: string | null,
  chainId: number | null,
  requiredAmount?: bigint
): Promise<WalletValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if wallet is connected
  if (!signer || !account) {
    errors.push('Wallet not connected');
    return {
      isValid: false,
      errors,
      warnings,
      canProceed: false,
    };
  }

  // Check network
  if (!chainId || chainId !== CHAIN_ID) {
    errors.push(`Wrong network. Please switch to ${appKitConfig.network.name} (Chain ID: ${CHAIN_ID})`);
  }

  // Check if signer is available
  try {
    const signerAddress = await signer.getAddress();
    if (signerAddress.toLowerCase() !== account.toLowerCase()) {
      errors.push('Signer address mismatch');
    }
  } catch (error) {
    errors.push('Failed to verify signer');
  }

  // Check balance if required amount is specified
  if (requiredAmount && signer) {
    try {
      const balance = await signer.provider?.getBalance(await signer.getAddress());
      if (balance && balance < requiredAmount) {
        errors.push('Insufficient balance for transaction');
      }
    } catch (error) {
      warnings.push('Could not check wallet balance');
    }
  }

  // Check gas price and network congestion
  try {
    if (signer.provider) {
      const gasPrice = await signer.provider.getGasPrice();
      const gasPriceGwei = formatUnits(gasPrice, 'gwei');

      if (parseFloat(gasPriceGwei) > 20) {
        warnings.push(`High gas price detected: ${gasPriceGwei} Gwei`);
      }
    }
  } catch (error) {
    warnings.push('Could not check gas price');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    canProceed: errors.length === 0,
  };
}

// Debug wallet state for troubleshooting
export async function debugWalletState(
  provider: BrowserProvider | null,
  signer: Signer | null,
  account: string | null,
  chainId: number | null
): Promise<WalletState> {
  let balance: string | null = null;

  // Get balance if possible
  if (signer && signer.provider) {
    try {
      const balanceWei = await signer.provider.getBalance(await signer.getAddress());
      balance = formatEther(balanceWei);
    } catch (error) {
      console.warn('Could not fetch balance:', error);
    }
  }

  const walletState: WalletState = {
    isConnected: !!account && !!signer,
    account,
    chainId,
    isCorrectNetwork: chainId === CHAIN_ID,
    hasSigner: !!signer,
    hasProvider: !!provider,
    balance,
  };

  // Log detailed state for debugging
  console.log('🔍 Wallet Debug State:', {
    ...walletState,
    expectedChainId: CHAIN_ID,
    networkName: appKitConfig.network.name,
    timestamp: new Date().toISOString(),
  });

  return walletState;
}

// Check if wallet refresh should be attempted
export function shouldAttemptWalletRefresh(
  isConnected: boolean,
  account: string | null,
  signer: Signer | null,
  lastRefreshAttempt: number | null
): boolean {
  // Don't refresh if not connected
  if (!isConnected) return false;

  // Don't refresh if we have a valid signer
  if (signer && account) return false;

  // Don't refresh too frequently (minimum 5 seconds between attempts)
  const now = Date.now();
  if (lastRefreshAttempt && (now - lastRefreshAttempt) < 5000) {
    return false;
  }

  return true;
}

// Validate network connection
export async function validateNetworkConnection(
  provider: BrowserProvider | null
): Promise<{ isValid: boolean; actualChainId: number | null; error?: string }> {
  if (!provider) {
    return {
      isValid: false,
      actualChainId: null,
      error: 'No provider available',
    };
  }

  try {
    const network = await provider.getNetwork();
    return {
      isValid: Number(network.chainId) === CHAIN_ID,
      actualChainId: Number(network.chainId),
    };
  } catch (error) {
    return {
      isValid: false,
      actualChainId: null,
      error: 'Failed to get network information',
    };
  }
}

// Estimate gas for transaction
export async function estimateTransactionGas(
  signer: Signer,
  to: string,
  data: string,
  value: bigint = 0n
): Promise<{ gasLimit: bigint; gasPrice: bigint; estimatedCost: bigint } | null> {
  try {
    if (!signer.provider) {
      throw new Error('No provider available');
    }

    const [gasLimit, gasPrice] = await Promise.all([
      signer.estimateGas({ to, data, value }),
      signer.provider.getGasPrice(),
    ]);

    const estimatedCost = gasLimit * gasPrice;

    return {
      gasLimit,
      gasPrice,
      estimatedCost,
    };
  } catch (error) {
    console.error('Failed to estimate gas:', error);
    return null;
  }
}

// Check if address has sufficient balance for transaction
export async function checkSufficientBalance(
  signer: Signer,
  requiredAmount: bigint,
  includeGasEstimate: boolean = true
): Promise<{ hasSufficientBalance: boolean; currentBalance: bigint; shortfall?: bigint }> {
  try {
    if (!signer.provider) {
      throw new Error('No provider available');
    }

    const currentBalance = await signer.provider.getBalance(await signer.getAddress());
    let totalRequired = requiredAmount;

    // Add gas estimate if requested
    if (includeGasEstimate) {
      try {
        const gasPrice = await signer.provider.getGasPrice();
        const gasLimit = 21000n; // Basic transfer gas limit
        const gasEstimate = gasPrice * gasLimit;
        totalRequired = requiredAmount + gasEstimate;
      } catch (error) {
        console.warn('Could not estimate gas for balance check:', error);
      }
    }

    const hasSufficientBalance = currentBalance >= totalRequired;
    const shortfall = hasSufficientBalance ? undefined : totalRequired - currentBalance;

    return {
      hasSufficientBalance,
      currentBalance,
      shortfall,
    };
  } catch (error) {
    console.error('Failed to check balance:', error);
    return {
      hasSufficientBalance: false,
      currentBalance: 0n,
      shortfall: requiredAmount,
    };
  }
}
