import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { Badge } from '../ui/Badge';
import { Alert, AlertDescription } from '../ui/alert';
import { ErrorModal } from '../ui/ErrorModal';
import {
  ArrowUpDown,
  Settings,
  Info,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Zap,
  AlertCircle
} from 'lucide-react';
import { ethers } from 'ethers';
import { useSecondaryMarketSwap } from '../../hooks/useSecondaryMarketSwap';
import { useWeb3 } from '../../providers/Web3Provider';
import { useRefreshContext } from '../../contexts/RefreshContext';
import { toast } from 'react-hot-toast';

interface SwapWidgetProps {
  onSwapComplete?: () => void;
}

export function SwapWidget({ onSwapComplete }: SwapWidgetProps) {
  const { account, isConnected, isCorrectNetwork } = useWeb3();
  const { refreshBalances } = useRefreshContext();
  const {
    loading,
    error,
    marketStats,
    usdtInfo,
    blocksInfo,
    isSecondaryMarketEnabled,
    getSwapQuote,
    approveToken,
    executeSwap,
    clearError,
    fetchTokenInfo
  } = useSecondaryMarketSwap();

  // Component state
  const [inputToken, setInputToken] = useState<'USDT' | 'BLOCKS'>('USDT');
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [slippage, setSlippage] = useState(5); // 5% default for low liquidity testing
  const [showSettings, setShowSettings] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Token info based on input selection
  const inputTokenInfo = inputToken === 'USDT' ? usdtInfo : blocksInfo;
  const outputTokenInfo = inputToken === 'USDT' ? blocksInfo : usdtInfo;
  const outputToken = inputToken === 'USDT' ? 'BLOCKS' : 'USDT';

  // Format token amounts for display
  const formatTokenAmount = useCallback((amount: bigint, decimals: number, precision: number = 4): string => {
    if (amount === 0n) return '0';
    return Number(ethers.formatUnits(amount, decimals)).toFixed(precision);
  }, []);

  // Parse input amount to bigint
  const parseInputAmount = useCallback((amount: string, decimals: number): bigint => {
    if (!amount || amount === '') return 0n;
    try {
      return ethers.parseUnits(amount, decimals);
    } catch {
      return 0n;
    }
  }, []);

  // Get quote when input changes
  const updateQuote = useCallback(async () => {
    if (!inputAmount || !inputTokenInfo || !isSecondaryMarketEnabled) {
      setQuote(null);
      setOutputAmount('');
      setSwapError(null);
      return;
    }

    const amountBigInt = parseInputAmount(inputAmount, inputTokenInfo.decimals);
    if (amountBigInt === 0n) {
      setQuote(null);
      setOutputAmount('');
      setSwapError(null);
      return;
    }

    setQuoteLoading(true);
    setSwapError(null);

    try {
      const newQuote = await getSwapQuote(inputToken, amountBigInt, slippage);
      if (newQuote && outputTokenInfo) {
        setQuote(newQuote);
        setOutputAmount(formatTokenAmount(newQuote.outputAmount, outputTokenInfo.decimals, 6));
        console.log('✅ Quote updated:', {
          inputAmount: inputAmount,
          outputAmount: formatTokenAmount(newQuote.outputAmount, outputTokenInfo.decimals, 6),
          exchangeRate: newQuote.exchangeRate
        });
      } else {
        setQuote(null);
        setOutputAmount('');
        setSwapError('Unable to get quote for this amount');
      }
    } catch (err: any) {
      console.error('Error getting quote:', err);
      setQuote(null);
      setOutputAmount('');
      setSwapError(err.message || 'Failed to get quote');
    } finally {
      setQuoteLoading(false);
    }
  }, [inputAmount, inputToken, inputTokenInfo, outputTokenInfo, slippage, getSwapQuote, parseInputAmount, formatTokenAmount, isSecondaryMarketEnabled]);

  // Update quote when dependencies change
  useEffect(() => {
    const timeoutId = setTimeout(updateQuote, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [updateQuote]);

  // Swap input and output tokens
  const handleSwapTokens = useCallback(() => {
    setInputToken(inputToken === 'USDT' ? 'BLOCKS' : 'USDT');
    setInputAmount(outputAmount);
    setOutputAmount('');
    setQuote(null);
  }, [inputToken, outputAmount]);

  // Set max balance
  const handleMaxBalance = useCallback(() => {
    if (inputTokenInfo) {
      const maxAmount = formatTokenAmount(inputTokenInfo.balance, inputTokenInfo.decimals, 6);
      setInputAmount(maxAmount);
    }
  }, [inputTokenInfo, formatTokenAmount]);

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        fetchTokenInfo(),
        refreshBalances()
      ]);
      // Also update quote if we have input amount
      if (inputAmount) {
        await updateQuote();
      }
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  }, [fetchTokenInfo, refreshBalances, inputAmount, updateQuote]);

  // Check if approval is needed
  const needsApproval = useMemo(() => {
    if (!inputTokenInfo || !inputAmount) return false;
    const amountBigInt = parseInputAmount(inputAmount, inputTokenInfo.decimals);
    return amountBigInt > inputTokenInfo.allowance;
  }, [inputTokenInfo, inputAmount, parseInputAmount]);

  // Handle token approval
  const handleApproval = useCallback(async () => {
    if (!inputTokenInfo || !inputAmount) return;

    const amountBigInt = parseInputAmount(inputAmount, inputTokenInfo.decimals);
    if (amountBigInt === 0n) return;

    setIsApproving(true);
    setSwapError(null);

    try {
      const success = await approveToken(inputToken, amountBigInt);
      if (success) {
        toast.success(`${inputToken} approved successfully!`);
        // Refresh token info to update allowance
        await fetchTokenInfo();
      } else {
        setSwapError('Approval failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Error approving token:', err);
      setSwapError(err.message || 'Failed to approve token');
    } finally {
      setIsApproving(false);
    }
  }, [inputTokenInfo, inputAmount, inputToken, parseInputAmount, approveToken, fetchTokenInfo]);

  // Handle swap execution
  const handleSwap = useCallback(async () => {
    if (!quote || !inputTokenInfo || !outputTokenInfo || !inputAmount) return;

    const amountBigInt = parseInputAmount(inputAmount, inputTokenInfo.decimals);
    if (amountBigInt === 0n) return;

    setIsExecuting(true);
    setSwapError(null);

    try {
      const success = await executeSwap(inputToken, amountBigInt, quote.minimumOutput);
      if (success) {
        toast.success('Swap completed successfully!');
        // Clear form and refresh data
        setInputAmount('');
        setOutputAmount('');
        setQuote(null);
        await Promise.all([
          fetchTokenInfo(),
          refreshBalances()
        ]);
        // Call completion callback
        onSwapComplete?.();
      } else {
        setSwapError('Swap failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Error executing swap:', err);
      const raw = String(err?.message || err);
      // Map low-level router errors to friendly copy
      let friendly = 'Swap failed. Please try again.';
      if (raw.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
        friendly = 'Slippage too high or liquidity too low. Try a smaller amount or higher slippage.';
      } else if (raw.includes('TRANSFER_FROM_FAILED') || raw.includes('insufficient')) {
        friendly = 'Insufficient balance or allowance.';
      } else if (raw.includes('user rejected') || err?.code === 4001) {
        friendly = 'Transaction cancelled.';
      }
      setSwapError(friendly);
      setErrorDetails(raw);
      setShowErrorModal(true);
    } finally {
      setIsExecuting(false);
    }
  }, [quote, inputTokenInfo, outputTokenInfo, inputAmount, inputToken, parseInputAmount, executeSwap, fetchTokenInfo, refreshBalances, onSwapComplete]);

  // Check if swap can be executed
  const canSwap = useMemo(() => {
    return !!(
      isConnected &&
      isCorrectNetwork &&
      isSecondaryMarketEnabled &&
      inputAmount &&
      quote &&
      inputTokenInfo &&
      outputTokenInfo &&
      !needsApproval
    );
  }, [isConnected, isCorrectNetwork, isSecondaryMarketEnabled, inputAmount, quote, inputTokenInfo, outputTokenInfo, needsApproval]);

  // Display error (prioritize swap error over general error)
  const displayError = swapError || error;

  // Show connection prompt if not connected
  if (!isConnected || !account) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4">
            <ArrowUpDown className="h-8 w-8 text-blue-600 mx-auto mt-2" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600 mb-4">
            Connect your wallet to start trading
          </p>
          <w3m-button />
        </CardContent>
      </Card>
    );
  }

  // Show network prompt if on wrong network
  if (!isCorrectNetwork) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
          <AlertDescription>
              Please switch to BSC Mainnet to access trading features
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show unavailable message if SecondaryMarket is not enabled
  if (!isSecondaryMarketEnabled) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Secondary market trading is not available. The SecondaryMarket contract needs to be deployed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Swap Tokens</h3>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="p-2"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={quoteLoading || loading}
              className="p-2"
              title="Refresh balances and quote"
            >
              <RefreshCw className={`h-4 w-4 ${quoteLoading || loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Alerts (compact) */}
        {(swapError || error) && !showErrorModal && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">{swapError || error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowErrorModal(true);
                }}
                className="p-1"
              >
                Details
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div>
              <Label className="text-sm font-medium">Slippage Tolerance</Label>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {[0.5, 1, 2, 5].map((value) => (
                  <Button
                    key={value}
                    variant={slippage === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSlippage(value)}
                    className="text-xs px-2 py-1"
                  >
                    {value}%
                  </Button>
                ))}
                <Input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(Number(e.target.value))}
                  className="w-16 sm:w-20 text-sm"
                  min="0.1"
                  max="50"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Input Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>From</Label>
            {inputTokenInfo && (
              <div className="text-xs sm:text-sm text-gray-600 truncate">
                Balance: {formatTokenAmount(inputTokenInfo.balance, inputTokenInfo.decimals, 4)} {inputTokenInfo.symbol}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="0.0"
                className="text-base sm:text-lg"
              />
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMaxBalance}
                disabled={!inputTokenInfo}
                className="text-xs px-2 py-1"
              >
                MAX
              </Button>
              <Badge variant="secondary" className="px-2 sm:px-3 py-1 text-xs">
                {inputToken}
              </Badge>
            </div>
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwapTokens}
            className="rounded-full p-2"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Output Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>To</Label>
            {outputTokenInfo && (
              <div className="text-xs sm:text-sm text-gray-600 truncate">
                Balance: {formatTokenAmount(outputTokenInfo.balance, outputTokenInfo.decimals, 4)} {outputTokenInfo.symbol}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="number"
                value={outputAmount}
                placeholder="0.0"
                className="text-base sm:text-lg"
                readOnly
              />
            </div>
            <Badge variant="secondary" className="px-2 sm:px-3 py-1 text-xs">
              {outputToken}
            </Badge>
          </div>
        </div>

        {/* Quote Information */}
        {quote && (
          <div className="p-3 bg-blue-50 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Exchange Rate:</span>
              <span>1 {inputToken} = {quote.exchangeRate.toFixed(6)} {outputToken}</span>
            </div>
            <div className="flex justify-between">
              <span>Trading Fee:</span>
              <span>{formatTokenAmount(quote.tradingFee, inputTokenInfo?.decimals || 18, 4)} {inputToken}</span>
            </div>
            <div className="flex justify-between">
              <span>Minimum Received:</span>
              <span>{formatTokenAmount(quote.minimumOutput, outputTokenInfo?.decimals || 18, 4)} {outputToken}</span>
            </div>
            <div className="flex justify-between">
              <span>Price Impact:</span>
              <span className={quote.priceImpact > 5 ? 'text-red-600' : 'text-green-600'}>
                {quote.priceImpact.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-2">
          {needsApproval ? (
            <Button
              onClick={handleApproval}
              disabled={isApproving || loading || !inputAmount || !!displayError}
              className="w-full"
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {isApproving ? `Approving ${inputToken}...` : `Approve ${inputToken}`}
            </Button>
          ) : (
            <Button
              onClick={handleSwap}
              disabled={!canSwap || isExecuting || quoteLoading || !!displayError}
              className="w-full"
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : quoteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowUpDown className="h-4 w-4 mr-2" />
              )}
              {isExecuting ? 'Swapping...' : quoteLoading ? 'Getting Quote...' : 'Swap'}
            </Button>
          )}

          {/* Helper text */}
          {!isConnected && (
            <p className="text-xs text-gray-500 text-center">
              Connect your wallet to start trading
            </p>
          )}
          {isConnected && !isCorrectNetwork && (
            <p className="text-xs text-red-500 text-center">
              Switch to BSC Mainnet to trade
            </p>
          )}
          {isConnected && isCorrectNetwork && !isSecondaryMarketEnabled && (
            <p className="text-xs text-orange-500 text-center">
              Secondary market not available
            </p>
          )}
        </div>

        {/* Market Stats */}
        {marketStats && (
          <div className="pt-4 border-t space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Trading Fee:</span>
              <span>{(marketStats.tradingFee / 100).toFixed(2)}%</span>
            </div>
          </div>
        )}
      </CardContent>
      {/* Error Modal */}
      <ErrorModal
        open={showErrorModal}
        title="Swap failed"
        message={(swapError || error) ?? 'An error occurred'}
        details={errorDetails || undefined}
        onClose={() => { setShowErrorModal(false); setErrorDetails(null); clearError(); setSwapError(null); }}
      />
    </Card>
  );
}
