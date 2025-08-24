import { Signer } from 'ethers';
import { appKitConfig } from './appkit';
import toast from 'react-hot-toast';

// Transaction error types
export interface TransactionError {
  code: string;
  message: string;
  userMessage: string;
  isUserRejection: boolean;
  isInsufficientFunds: boolean;
  isNetworkError: boolean;
}

// Parse transaction errors into user-friendly messages
export function parseTransactionError(error: any): TransactionError {
  const errorString = error?.message || error?.toString() || 'Unknown error';
  const errorCode = error?.code || 'UNKNOWN';

  // User rejection
  if (errorCode === 4001 || errorString.includes('User denied') || errorString.includes('user rejected')) {
    return {
      code: 'USER_REJECTED',
      message: errorString,
      userMessage: 'Transaction was cancelled by user',
      isUserRejection: true,
      isInsufficientFunds: false,
      isNetworkError: false,
    };
  }

  // Insufficient funds
  if (errorString.includes('insufficient funds') || errorString.includes('insufficient balance')) {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: errorString,
      userMessage: 'Insufficient funds for transaction',
      isUserRejection: false,
      isInsufficientFunds: true,
      isNetworkError: false,
    };
  }

  // Gas estimation failed
  if (errorString.includes('gas') && (errorString.includes('estimate') || errorString.includes('limit'))) {
    return {
      code: 'GAS_ESTIMATION_FAILED',
      message: errorString,
      userMessage: 'Transaction would fail. Please check your inputs and try again.',
      isUserRejection: false,
      isInsufficientFunds: false,
      isNetworkError: false,
    };
  }

  // Filter not found error (ethers.js event listener issue)
  if (errorString.includes('filter not found') || errorCode === -32000) {
    return {
      code: 'FILTER_ERROR',
      message: errorString,
      userMessage: 'Event monitoring error. Transaction may still succeed - please check your wallet.',
      isUserRejection: false,
      isInsufficientFunds: false,
      isNetworkError: true,
    };
  }

  // Network errors
  if (errorString.includes('network') || errorString.includes('connection') || errorCode === 'NETWORK_ERROR') {
    return {
      code: 'NETWORK_ERROR',
      message: errorString,
      userMessage: 'Network connection error. Please check your connection and try again.',
      isUserRejection: false,
      isInsufficientFunds: false,
      isNetworkError: true,
    };
  }

  // Contract revert - provide more specific guidance
  if (errorString.includes('revert') || errorString.includes('execution reverted')) {
    let userMessage = 'Transaction failed. ';

    if (errorString.includes('Package not active')) {
      userMessage += 'This package is not currently active.';
    } else if (errorString.includes('Invalid package')) {
      userMessage += 'Package not found.';
    } else if (errorString.includes('insufficient')) {
      userMessage += 'Insufficient balance or allowance.';
    } else if (errorString.includes('Cannot refer yourself')) {
      userMessage += 'You cannot refer yourself.';
    } else if (errorString.includes('unknown custom error')) {
      userMessage += 'Please check your balance, allowances, and package status.';
    } else {
      userMessage += 'Please check your inputs and try again.';
    }

    return {
      code: 'CONTRACT_REVERT',
      message: errorString,
      userMessage,
      isUserRejection: false,
      isInsufficientFunds: false,
      isNetworkError: false,
    };
  }

  // Generic error
  return {
    code: 'UNKNOWN_ERROR',
    message: errorString,
    userMessage: 'Transaction failed. Please try again.',
    isUserRejection: false,
    isInsufficientFunds: false,
    isNetworkError: false,
  };
}

// Execute transaction with proper error handling
export async function executeTransaction<T>(
  transactionFn: () => Promise<T>,
  options?: {
    onStart?: () => void;
    onSuccess?: (result: T) => void;
    onError?: (error: TransactionError) => void;
    onFinally?: () => void;
    successMessage?: string;
    errorMessage?: string;
    showToasts?: boolean;
  }
): Promise<{ success: boolean; result?: T; error?: TransactionError }> {
  const {
    onStart,
    onSuccess,
    onError,
    onFinally,
    successMessage = 'Transaction successful!',
    errorMessage,
    showToasts = true,
  } = options || {};

  try {
    // Call onStart callback if provided
    onStart?.();

    const result = await transactionFn();

    if (showToasts) {
      toast.success(successMessage);
    }

    onSuccess?.(result);
    return { success: true, result };
  } catch (error) {
    const parsedError = parseTransactionError(error);

    if (showToasts && !parsedError.isUserRejection) {
      toast.error(errorMessage || parsedError.userMessage);
    }

    onError?.(parsedError);
    console.error('Transaction failed:', parsedError);
    return { success: false, error: parsedError };
  } finally {
    // Call onFinally callback if provided
    onFinally?.();
  }
}

// Get transaction URL for block explorer
export function getTransactionUrl(txHash: string): string {
  return `${appKitConfig.network.explorerUrl}/tx/${txHash}`;
}

// Get address URL for block explorer
export function getAddressUrl(address: string): string {
  return `${appKitConfig.network.explorerUrl}/address/${address}`;
}

// Wait for transaction with user feedback
export async function waitForTransactionWithFeedback(
  tx: ethers.ContractTransaction,
  options?: {
    confirmations?: number;
    onConfirmation?: (confirmations: number) => void;
    showToasts?: boolean;
  }
): Promise<ethers.ContractReceipt | null> {
  const {
    confirmations = 1,
    onConfirmation,
    showToasts = true,
  } = options || {};

  try {
    if (showToasts) {
      toast.loading('Waiting for transaction confirmation...', {
        id: tx.hash,
      });
    }

    const receipt = await tx.wait(confirmations);
    
    if (showToasts) {
      toast.success('Transaction confirmed!', {
        id: tx.hash,
      });
    }

    onConfirmation?.(receipt.confirmations);
    return receipt;
  } catch (error) {
    const parsedError = parseTransactionError(error);
    
    if (showToasts) {
      toast.error(`Transaction failed: ${parsedError.userMessage}`, {
        id: tx.hash,
      });
    }

    console.error('Transaction confirmation failed:', parsedError);
    return null;
  }
}

// Estimate gas with buffer
export async function estimateGasWithBuffer(
  contract: any,
  method: string,
  args: any[],
  bufferPercent: number = 20
): Promise<bigint> {
  try {
    const estimatedGas = await contract[method].estimateGas(...args);
    const buffer = (estimatedGas * BigInt(bufferPercent)) / 100n;
    return estimatedGas + buffer;
  } catch (error) {
    console.error('Gas estimation failed:', error);
    // Return a reasonable default gas limit
    return 300000n;
  }
}

// Check if user has sufficient balance for transaction
export async function checkSufficientBalance(
  signer: Signer,
  requiredAmount: bigint,
  gasEstimate?: bigint
): Promise<{ sufficient: boolean; shortfall?: bigint }> {
  try {
    if (!signer.provider) {
      throw new Error('No provider available');
    }

    const balance = await signer.provider.getBalance(await signer.getAddress());
    let totalRequired = requiredAmount;

    if (gasEstimate) {
      const gasPrice = await signer.provider.getGasPrice();
      const gasCost = gasEstimate * gasPrice;
      totalRequired = requiredAmount + gasCost;
    }

    if (balance >= totalRequired) {
      return { sufficient: true };
    } else {
      return {
        sufficient: false,
        shortfall: totalRequired - balance,
      };
    }
  } catch (error) {
    console.error('Balance check failed:', error);
    return { sufficient: false };
  }
}

// Format transaction error for display
export function formatTransactionError(error: TransactionError): string {
  if (error.isUserRejection) {
    return 'Transaction cancelled';
  }
  
  if (error.isInsufficientFunds) {
    return 'Insufficient funds';
  }
  
  if (error.isNetworkError) {
    return 'Network error';
  }
  
  return error.userMessage;
}

// Copy transaction hash to clipboard
export async function copyTransactionHash(txHash: string): Promise<boolean> {
  const { copyToClipboardWithFeedback } = await import('./referral');
  return await copyToClipboardWithFeedback(
    txHash,
    'Transaction hash copied to clipboard',
    'Failed to copy transaction hash'
  );
}

// Open transaction in block explorer
export function openTransactionInExplorer(txHash: string): void {
  const url = getTransactionUrl(txHash);
  window.open(url, '_blank', 'noopener,noreferrer');
}
