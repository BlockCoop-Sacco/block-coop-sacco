import { useState, useEffect, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { useWeb3 } from '../../providers/Web3Provider';
import { isAddress, ZeroAddress, MaxUint256, ethers } from 'ethers';
import { Package, calculateSplitsWithTargetPrice, PackageSplits } from '../../lib/contracts';
import { formatUSDT, formatBLOCKS, formatPercentage } from '../../lib/utils';
import { getTransactionUrl, executeTransaction } from '../../lib/transactionErrors';
import { getReferrerFromURL, isValidReferrer, formatReferrerAddress } from '../../lib/referral';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { PaymentMethodSelector, PaymentMethod } from '../payments/PaymentMethodSelector';
import { MpesaPaymentForm } from '../payments/MpesaPaymentForm';
import { X, Info, TrendingUp, ExternalLink, Copy, Users, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface PurchaseModalProps {
  package: Package;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PurchaseModal({ package: pkg, isOpen, onClose, onSuccess }: PurchaseModalProps) {
  const { account: address, signer, isConnected, isCorrectNetwork, contracts } = useWeb3();
  const [referrer, setReferrer] = useState('');
  const [referrerFromURL, setReferrerFromURL] = useState<string | null>(null);
  const [referrerDetected, setReferrerDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [usdtDecimals, setUsdtDecimals] = useState<number>(18); // Default to 18 for V2 architecture
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [showMpesaForm, setShowMpesaForm] = useState(false);
  const [splits, setSplits] = useState<PackageSplits>({
    totalTokens: 0n,
    vestTokens: 0n,
    poolTokens: 0n,
    usdtPool: 0n,
    usdtVault: 0n,
  });
  const [splitsLoading, setSplitsLoading] = useState(true);

  // FIXED: All packages store entryUSDT in USDT's native decimals (18 for V2)
  // The contract expects and transfers exactly pkg.entryUSDT (18 decimals)
  const packageCostForContract = pkg.entryUSDT; // Contract will transfer this exact amount
  const packageCostUSDT = pkg.entryUSDT; // Same value - already in 18 decimals
  const needsApproval = allowance < packageCostForContract;

  // Detect referrer from URL on modal open
  useEffect(() => {
    if (isOpen) {
      const urlReferrer = getReferrerFromURL();
      if (urlReferrer && urlReferrer !== address) {
        setReferrerFromURL(urlReferrer);
        setReferrer(urlReferrer);
        setReferrerDetected(true);
        console.log('Referrer detected from URL:', urlReferrer);
      } else {
        setReferrerFromURL(null);
        setReferrerDetected(false);
      }
    }
  }, [isOpen, address]);

  // Calculate splits with current global target price
  useEffect(() => {
    const loadSplits = async () => {
      try {
        setSplitsLoading(true);
        const calculatedSplits = await calculateSplitsWithTargetPrice(pkg);
        setSplits(calculatedSplits);
      } catch (error) {
        console.error('Error calculating splits for package:', pkg.name, error);
        // Keep fallback values already set in state
      } finally {
        setSplitsLoading(false);
      }
    };

    loadSplits();
  }, [pkg]);

  // Helper function to format USDT amounts with 4 decimal places using consistent USDT decimals
  const formatTokenDisplay = (amount: bigint): string => {
    try {
      // Use consistent 18 decimals for V2 architecture
      const formatted = ethers.formatUnits(amount, 18);
      const num = parseFloat(formatted);
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      });
    } catch {
      return '0';
    }
  };

  // Utility function to create enhanced transaction success notification
  const createTransactionSuccessToast = (message: string, txHash: string) => {
    const explorerUrl = getTransactionUrl(txHash);
    const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;

    const copyToClipboard = async () => {
      const { copyToClipboardWithFeedback } = await import('../../lib/referral');
      await copyToClipboardWithFeedback(
        txHash,
        'Transaction hash copied!',
        'Failed to copy transaction hash'
      );
    };

    return (
      <div className="flex items-center justify-between space-x-3 min-w-0">
        <span className="flex-shrink-0">{message}</span>
        <div className="flex items-center space-x-2 min-w-0">
          <span className="text-xs text-gray-500 font-mono truncate">{shortHash}</span>
          <button
            onClick={copyToClipboard}
            className="text-blue-500 hover:text-blue-700 flex-shrink-0"
            title="Copy transaction hash"
          >
            <Copy className="h-3 w-3" />
          </button>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 flex-shrink-0"
            title="View on block explorer"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  };

  useEffect(() => {
    let mounted = true;

    console.log('PurchaseModal: Address/isOpen/contracts changed:', {
      address,
      isOpen,
      isConnected,
      signer: !!signer,
      hasContracts: !!contracts,
      hasUsdtToken: !!contracts?.usdtToken,
      hasPackageManager: !!contracts?.packageManager,
      contractsFromWeb3: contracts,
      usdtTokenAddress: contracts?.usdtToken?.address,
      packageManagerAddress: contracts?.packageManager?.address,
      usdtTokenTarget: contracts?.usdtToken?.target,
      packageManagerTarget: contracts?.packageManager?.target
    });

    if (address && isOpen && contracts?.usdtToken && contracts?.packageManager) {
      console.log('PurchaseModal: Loading balances for address:', address);
      loadBalances(contracts, mounted);
    } else {
      console.log('PurchaseModal: Skipping loadBalances - requirements not met:', {
        hasAddress: !!address,
        isOpen,
        hasContracts: !!contracts,
        hasUsdtToken: !!contracts?.usdtToken,
        hasPackageManager: !!contracts?.packageManager
      });
    }

    return () => {
      mounted = false;
    };
  }, [address, isOpen, contracts]);

  // Reset form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setReferrer('');
      setLoading(false);
      setPaymentMethod('wallet');
      setShowMpesaForm(false);
    }
  }, [isOpen]);

  // Handle M-Pesa payment success
  const handleMpesaSuccess = (transactionId: string) => {
    toast.success('M-Pesa payment completed! Your USDT package will be processed shortly.');
    onSuccess();
    onClose();
  };

  // Handle payment method change
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === 'mpesa') {
      setShowMpesaForm(true);
    } else {
      setShowMpesaForm(false);
    }
  };

  const loadBalances = async (contractInstances: any, mounted = true) => {
    try {
      // Validate that address is available before making contract calls
      if (!address) {
        console.warn('loadBalances called with null/undefined address');
        return;
      }

      // Validate that contracts are properly initialized
      console.log('loadBalances: Contract validation debug:', {
        contractInstances,
        hasUsdtToken: !!contractInstances?.usdtToken,
        hasPackageManager: !!contractInstances?.packageManager,
        usdtTokenType: typeof contractInstances?.usdtToken,
        packageManagerType: typeof contractInstances?.packageManager,
        usdtTokenKeys: contractInstances?.usdtToken ? Object.getOwnPropertyNames(contractInstances.usdtToken) : [],
        packageManagerKeys: contractInstances?.packageManager ? Object.getOwnPropertyNames(contractInstances.packageManager) : [],
        usdtTokenAddress: contractInstances?.usdtToken?.address,
        usdtTokenTarget: contractInstances?.usdtToken?.target,
        packageManagerAddress: contractInstances?.packageManager?.address,
        packageManagerTarget: contractInstances?.packageManager?.target
      });

      if (!contractInstances?.usdtToken || !contractInstances?.packageManager) {
        console.error('loadBalances called with invalid contracts');
        return;
      }

      // Check if addresses are available (Ethers v6 uses .target property)
      const usdtAddress = contractInstances.usdtToken.target || contractInstances.usdtToken.address;
      const packageManagerAddress = contractInstances.packageManager.target || contractInstances.packageManager.address;

      if (!usdtAddress || !packageManagerAddress) {
        console.error('Contract addresses are undefined:', {
          usdtAddress,
          packageManagerAddress,
          usdtTokenTarget: contractInstances.usdtToken.target,
          usdtTokenAddress: contractInstances.usdtToken.address,
          packageManagerTarget: contractInstances.packageManager.target,
          packageManagerAddressProperty: contractInstances.packageManager.address,
          usdtTokenContract: contractInstances.usdtToken,
          packageManagerContract: contractInstances.packageManager
        });
        return;
      }

      console.log('loadBalances: Making contract calls with:', {
        address,
        usdtTokenAddress: usdtAddress,
        packageManagerAddress: packageManagerAddress
      });

      // Use the same reliable approach as Portfolio component
      // Import the helper functions from contracts.ts instead of calling decimals() directly
      const { getUSDTBalance } = await import('../../lib/contracts');

      // Get balance and allowance with individual error handling
      let balance = 0n;
      let currentAllowance = 0n;

      try {
        balance = await getUSDTBalance(address);
        console.log('loadBalances: Successfully got balance:', balance.toString());
      } catch (balanceError) {
        console.error('Error getting USDT balance:', balanceError);
        balance = 0n;
      }

      try {
        currentAllowance = await contractInstances.usdtToken.allowance(address, packageManagerAddress);
        console.log('loadBalances: Successfully got allowance:', currentAllowance.toString());
      } catch (allowanceError) {
        console.error('Error getting USDT allowance:', allowanceError);
        console.error('Allowance call details:', {
          userAddress: address,
          spenderAddress: packageManagerAddress,
          usdtTokenAddress: contractInstances.usdtToken.target || contractInstances.usdtToken.address
        });
        currentAllowance = 0n;
      }

      // USDT uses 18 decimals in V2 architecture - no need to call decimals() which causes the error
      const usdtDecimals = 18;

      console.log('loadBalances: Contract calls successful:', {
        balance: balance.toString(),
        balanceFormatted18: ethers.formatUnits(balance, 18),
        allowance: currentAllowance.toString(),
        allowanceFormatted18: ethers.formatUnits(currentAllowance, 18),
        usdtDecimals: usdtDecimals.toString(),
        balanceFormattedActual: ethers.formatUnits(balance, usdtDecimals),
        allowanceFormattedActual: ethers.formatUnits(currentAllowance, usdtDecimals)
      });

      // Only update state if component is still mounted
      if (mounted) {
        console.log('loadBalances: Updating state with balance:', balance.toString());
        setUsdtBalance(balance);
        setAllowance(currentAllowance);
        setUsdtDecimals(Number(usdtDecimals));
        console.log('loadBalances: State update calls completed');
      }
    } catch (error) {
      console.error('Error loading balances:', error);
      console.error('Address at time of error:', address);
      console.error('Contracts at time of error:', {
        usdtToken: contractInstances?.usdtToken,
        packageManager: contractInstances?.packageManager
      });

      // Set safe defaults on error to prevent blocking the UI
      if (mounted) {
        console.log('loadBalances: Setting safe defaults due to error');
        setUsdtBalance(0n);
        setAllowance(0n);
        setUsdtDecimals(18); // V2 architecture uses 18 decimals
      }
    }
  };

  const handleApprove = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isCorrectNetwork) {
      toast.error('Please switch to BSC Testnet');
      return;
    }

    // Execute approval transaction with enhanced error handling
    const result = await executeTransaction(
      async () => {
        if (!isConnected) throw new Error('Please connect your wallet first');
        if (!signer) throw new Error('No signer available - please ensure your wallet is connected');
        if (!contracts?.usdtToken || !contracts?.packageManager) throw new Error('Contracts not properly initialized');

        const packageManagerAddress = contracts.packageManager.target || contracts.packageManager.address;
        console.log('handleApprove: Approving USDT for PackageManager:', {
          usdtTokenAddress: contracts.usdtToken.target || contracts.usdtToken.address,
          packageManagerAddress,
          approvalAmount: MaxUint256.toString(),
          userAddress: address
        });

        const tx = await contracts.usdtToken.approve(
          packageManagerAddress,
          MaxUint256
        );

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        return { tx, receipt };
      },
      {
        onStart: () => {
          setLoading(true);
          toast.loading('Approving USDT...', { id: 'approve' });
        },
        onSuccess: async ({ tx }) => {
          const txHash = tx.hash;

          // Show enhanced success message with transaction details
          toast.success(
            createTransactionSuccessToast('USDT approved successfully!', txHash),
            { id: 'approve', duration: 8000 }
          );

          // Reload balances to update allowance and re-verify approval
          if (address && contracts?.usdtToken && contracts?.packageManager) {
            await loadBalances(contracts);

            // Re-verify that allowance is sufficient after approval
            try {
              const packageManagerAddress = contracts.packageManager.target || contracts.packageManager.address;
              const newAllowance = await contracts.usdtToken.allowance(address, packageManagerAddress);
              console.log('Approval verification:', {
                userAddress: address,
                packageManagerAddress,
                newAllowance: newAllowance.toString(),
                newAllowanceFormatted: ethers.formatUnits(newAllowance, usdtDecimals),
                packageCost: packageCostForContract.toString(),
                packageCostFormatted: ethers.formatUnits(packageCostForContract, usdtDecimals),
                isAllowanceSufficient: newAllowance >= packageCostForContract
              });

              if (newAllowance >= packageCostForContract) {
                toast.success('Approval verified - you can now purchase the package!', { duration: 3000 });
              } else {
                toast.error('Approval completed but allowance may be insufficient. Please try again.', { duration: 5000 });
              }
            } catch (error) {
              console.error('Error re-verifying allowance:', error);
            }
          }
        },
        onError: (error) => {
          console.error('Approval error:', error);

          // Show user-friendly error message
          if (error.isUserRejection) {
            toast.error('Approval cancelled', { id: 'approve' });
          } else if (error.isInsufficientFunds) {
            toast.error('Insufficient funds for gas fee', { id: 'approve' });
          } else if (error.isNetworkError) {
            toast.error('Network error. Please check your connection and try again', { id: 'approve' });
          } else {
            toast.error(error.userMessage, { id: 'approve' });
          }
        },
        onFinally: () => {
          setLoading(false);
        }
      }
    );

    return result.success;
  };

  const handlePurchase = async () => {
    // Validate required parameters
    if (!pkg?.id && pkg?.id !== 0) {
      toast.error('Invalid package ID');
      return;
    }

    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isCorrectNetwork) {
      toast.error('Please switch to BSC Testnet');
      return;
    }

    // Validate referrer address if provided
    if (referrer.trim() && !isAddress(referrer.trim())) {
      toast.error('Invalid referrer address');
      return;
    }

    // Prevent self-referral
    if (referrer.trim() && referrer.trim().toLowerCase() === address.toLowerCase()) {
      toast.error('You cannot refer yourself');
      return;
    }

    const referrerAddress = referrer.trim() || ZeroAddress;

    // Execute transaction with enhanced error handling
    const result = await executeTransaction(
      async () => {
        if (!isConnected) throw new Error('Please connect your wallet first');
        if (!signer) throw new Error('No signer available - please ensure your wallet is connected');
        if (!contracts?.packageManager) throw new Error('Package manager contract not properly initialized');

        const packageManagerAddress = contracts.packageManager.target || contracts.packageManager.address;
        console.log('handlePurchase: Purchasing package from PackageManager:', {
          packageManagerAddress,
          packageId: pkg.id,
          referrerAddress,
          userAddress: address,
          packageCost: pkg.entryUSDT.toString(),
          packageCostFormatted: ethers.formatUnits(pkg.entryUSDT, 18),
          currentAllowance: allowance.toString(),
          currentAllowanceFormatted: ethers.formatUnits(allowance, 18),
          isAllowanceSufficient: allowance >= packageCostForContract
        });

        const tx = await contracts.packageManager.purchase(pkg.id, referrerAddress);

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        return { tx, receipt };
      },
      {
        onStart: () => {
          setLoading(true);
          toast.loading('Processing purchase...', { id: 'purchase' });
        },
        onSuccess: ({ tx }) => {
          const txHash = tx.hash;

          // Show enhanced success message with transaction details
          toast.success(
            createTransactionSuccessToast('Package purchased successfully!', txHash),
            { id: 'purchase', duration: 8000 }
          );

          // Trigger post-transaction actions
          handlePostTransactionSuccess();
        },
        onError: (error) => {
          console.error('Purchase error:', error);

          // Show user-friendly error message
          if (error.isUserRejection) {
            toast.error('Transaction cancelled', { id: 'purchase' });
          } else if (error.isInsufficientFunds) {
            toast.error('Insufficient funds for this transaction', { id: 'purchase' });
          } else if (error.isNetworkError) {
            toast.error('Network error. Please check your connection and try again', { id: 'purchase' });
          } else {
            toast.error(error.userMessage, { id: 'purchase' });
          }
        },
        onFinally: () => {
          setLoading(false);
        }
      }
    );

    return result.success;
  };

  const handlePostTransactionSuccess = () => {
    // Clear form state
    setReferrer('');

    // Reset loading state (should already be done by onFinally, but ensure it's reset)
    setLoading(false);

    // Close the modal after a brief delay to allow user to see success message
    setTimeout(() => {
      onClose();
    }, 1000);

    // Trigger package list refresh and other success actions
    // This will refresh the package data and user balances in the parent component
    onSuccess();
  };

  // Enhanced balance validation with better error handling
  const hasInsufficientBalance = useMemo(() => {
    // If we don't have a valid balance (0n could be valid or could indicate an error)
    // and we're connected, we should be more careful about blocking the user
    if (!isConnected || !address) {
      return true; // Block if not connected
    }

    // If contracts aren't loaded yet, don't block (show loading instead)
    if (!contracts?.usdtToken) {
      return false;
    }

    // Only block if we have a definitive balance that's insufficient
    return usdtBalance < packageCostUSDT;
  }, [usdtBalance, packageCostUSDT, isConnected, address, contracts?.usdtToken]);

  // Debug logging for balance comparison
  console.log('PurchaseModal: Balance check (all values in USDT 18 decimals):', {
    usdtBalance: usdtBalance.toString(),
    usdtBalanceFormatted: ethers.formatUnits(usdtBalance, 18),
    usdtDecimals: 18,
    packageCost: pkg.entryUSDT.toString(),
    packageCostFormatted: ethers.formatUnits(pkg.entryUSDT, 18),
    hasInsufficientBalance,
    address,
    isConnected,
    allowance: allowance.toString(),
    allowanceFormatted: ethers.formatUnits(allowance, 18),
    needsApproval,
    contractsAvailable: !!contracts,
    contractsLoaded: !!contracts?.usdtToken
  });

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4">
        <Dialog.Panel className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-2xl bg-white rounded-2xl shadow-2xl animate-slide-up max-h-[95vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <Dialog.Title className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 pr-2">
                Purchase {pkg.name}
              </Dialog.Title>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Package Summary */}
              <Card className="border-primary-200 bg-primary-50/50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
                    <h3 className="font-semibold text-gray-900 mb-2 sm:mb-0">Package Summary</h3>
                    <div className="text-xl sm:text-2xl font-bold text-primary-600">
                      ${formatUSDT(pkg.entryUSDT)} USDT
                    </div>
                  </div>
                  
                  {splitsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                      <span className="ml-3 text-sm text-gray-500">Calculating with current target price...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">LP Pool USDT</p>
                        <p className="font-medium">${formatUSDT(splits.usdtPool)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Treasury USDT</p>
                        <p className="font-medium">${formatUSDT(splits.usdtVault)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">LP Pool BLOCKS</p>
                        <p className="font-medium">{formatBLOCKS(splits.poolTokens)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Vested BLOCKS</p>
                        <p className="font-medium">{formatBLOCKS(splits.vestTokens)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Referrer Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Referrer Address (Optional)
                  </label>
                  {referrerDetected && (
                    <Badge variant="success" className="flex items-center text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      Auto-detected
                    </Badge>
                  )}
                </div>

                <Input
                  placeholder="0x..."
                  value={referrer}
                  onChange={(e) => {
                    setReferrer(e.target.value);
                    // Clear auto-detection flag if user manually changes
                    if (referrerDetected && e.target.value !== referrerFromURL) {
                      setReferrerDetected(false);
                    }
                  }}
                  disabled={loading}
                  className={referrerDetected ? 'border-green-300 bg-green-50' : ''}
                />

                {/* Referrer Status Messages */}
                <div className="mt-2 space-y-1">
                  {referrerDetected && referrerFromURL && (
                    <div className="flex items-center text-sm text-green-600">
                      <Users className="h-4 w-4 mr-1" />
                      Referrer detected from link: {formatReferrerAddress(referrerFromURL)}
                    </div>
                  )}

                  {referrer && !isValidReferrer(referrer) && (
                    <div className="flex items-center text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Invalid referrer address format
                    </div>
                  )}

                  {referrer && isValidReferrer(referrer) && referrer === address && (
                    <div className="flex items-center text-sm text-orange-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      You cannot refer yourself
                    </div>
                  )}

                  {pkg.referralBps > 0 && referrer && isValidReferrer(referrer) && referrer !== address && (
                    <div className="flex items-center text-sm text-accent-600">
                      <Info className="h-4 w-4 mr-1" />
                      Referrer will receive {formatPercentage(pkg.referralBps)} BLOCKS bonus
                    </div>
                  )}

                  {pkg.referralBps > 0 && !referrer && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Info className="h-4 w-4 mr-1" />
                      Enter a referrer address to give them {formatPercentage(pkg.referralBps)} bonus
                    </div>
                  )}
                </div>
              </div>

              {/* Balance Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Your USDT Balance:</span>
                  {!contracts?.usdtToken ? (
                    <span className="font-medium text-gray-500">Loading...</span>
                  ) : (
                    <span className={`font-medium ${hasInsufficientBalance ? 'text-error-600' : 'text-gray-900'}`}>
                      ${formatTokenDisplay(usdtBalance)}
                    </span>
                  )}
                </div>
                {hasInsufficientBalance && contracts?.usdtToken && (
                  <p className="text-error-600 text-sm mt-2">
                    Insufficient USDT balance for this purchase
                  </p>
                )}
                {!contracts?.usdtToken && (
                  <p className="text-gray-500 text-sm mt-2">
                    Loading balance information...
                  </p>
                )}


              </div>

              {/* Payment Method Selection */}
              {!showMpesaForm && (
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onMethodChange={handlePaymentMethodChange}
                  packageAmount={parseFloat(ethers.formatUnits(pkg.entryUSDT, 18))}
                  disabled={loading}
                />
              )}

              {/* M-Pesa Payment Form */}
              {showMpesaForm && address && (
                <MpesaPaymentForm
                  walletAddress={address}
                  packageId={pkg.id}
                  amount={parseFloat(ethers.formatUnits(pkg.entryUSDT, 18))}
                  referrerAddress={referrer || undefined}
                  onSuccess={handleMpesaSuccess}
                  onCancel={() => setShowMpesaForm(false)}
                />
              )}

              {/* Action Buttons - Only show for wallet payments */}
              {!showMpesaForm && (
                <div className="flex flex-col sm:flex-row gap-3">
                {needsApproval ? (
                  <Button
                    onClick={handleApprove}
                    loading={loading}
                    disabled={
                      loading ||
                      !isConnected ||
                      !signer ||
                      hasInsufficientBalance ||
                      !isCorrectNetwork
                    }
                    className="w-full sm:flex-1"
                    size="lg"
                  >
                    Approve USDT
                  </Button>
                ) : (
                  <Button
                    onClick={handlePurchase}
                    loading={loading}
                    disabled={
                      loading ||
                      !isConnected ||
                      !signer ||
                      hasInsufficientBalance ||
                      !isCorrectNetwork
                    }
                    className="w-full sm:flex-1"
                    size="lg"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Purchase Package</span>
                    <span className="sm:hidden">Purchase</span>
                  </Button>
                )}
                <Button variant="outline" onClick={onClose} className="w-full sm:flex-1" size="lg">
                  Cancel
                </Button>
                </div>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}