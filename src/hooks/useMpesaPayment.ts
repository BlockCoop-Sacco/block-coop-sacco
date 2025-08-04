import { useState, useCallback, useEffect, useRef } from 'react';
import { useWeb3 } from '../providers/Web3Provider';
import mpesaApi, { MpesaPaymentRequest, MpesaTransactionStatus } from '../services/mpesaApi';
import toast from 'react-hot-toast';

export type PaymentStatus = 'idle' | 'initiating' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'timeout';

interface MpesaPaymentState {
  status: PaymentStatus;
  transactionId: string | null;
  checkoutRequestId: string | null;
  error: string | null;
  amount: {
    usd: number;
    kes: number;
  } | null;
  loading: boolean;
}

interface MpesaPaymentHook {
  // State
  paymentState: MpesaPaymentState;
  
  // Actions
  initiatePayment: (paymentData: Omit<MpesaPaymentRequest, 'walletAddress'>) => Promise<boolean>;
  queryPaymentStatus: (checkoutRequestId: string) => Promise<MpesaTransactionStatus | null>;
  resetPayment: () => void;
  
  // Status tracking
  startStatusPolling: (checkoutRequestId: string) => void;
  stopStatusPolling: () => void;
}

export function useMpesaPayment(): MpesaPaymentHook {
  const { account: walletAddress } = useWeb3();
  const [paymentState, setPaymentState] = useState<MpesaPaymentState>({
    status: 'idle',
    transactionId: null,
    checkoutRequestId: null,
    error: null,
    amount: null,
    loading: false
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopStatusPolling();
    };
  }, []);

  // Initiate M-Pesa payment
  const initiatePayment = useCallback(async (paymentData: Omit<MpesaPaymentRequest, 'walletAddress'>): Promise<boolean> => {
    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return false;
    }

    setPaymentState(prev => ({
      ...prev,
      status: 'initiating',
      loading: true,
      error: null
    }));

    try {
      const requestData = {
        ...paymentData,
        walletAddress
      };

      // Debug logging
      console.log('🔍 M-Pesa Payment Request Data:', {
        walletAddress: requestData.walletAddress,
        packageId: requestData.packageId,
        phoneNumber: requestData.phoneNumber,
        amount: requestData.amount,
        referrerAddress: requestData.referrerAddress,
        types: {
          walletAddress: typeof requestData.walletAddress,
          packageId: typeof requestData.packageId,
          phoneNumber: typeof requestData.phoneNumber,
          amount: typeof requestData.amount,
          referrerAddress: typeof requestData.referrerAddress
        }
      });

      const response = await mpesaApi.initiatePayment(requestData);

      if (response.success && response.transactionId && response.checkoutRequestId) {
        setPaymentState(prev => ({
          ...prev,
          status: 'pending',
          transactionId: response.transactionId,
          checkoutRequestId: response.checkoutRequestId,
          amount: response.amount || null,
          loading: false
        }));

        toast.success('Payment request sent to your phone. Please check your M-Pesa notifications.');
        
        // Start polling for status updates
        startStatusPolling(response.checkoutRequestId);
        
        return true;
      } else {
        const errorMessage = response.error || 'Failed to initiate payment';

        setPaymentState(prev => ({
          ...prev,
          status: 'failed',
          error: errorMessage,
          loading: false
        }));

        // Show user-friendly error message
        if (errorMessage.includes('connect') || errorMessage.includes('network')) {
          toast.error('Connection issue. Please check your internet and try again.');
        } else if (errorMessage.includes('unavailable')) {
          toast.error('M-Pesa service is temporarily unavailable. Please try again later.');
        } else {
          toast.error(errorMessage);
        }
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to initiate payment';

      setPaymentState(prev => ({
        ...prev,
        status: 'failed',
        error: errorMessage,
        loading: false
      }));

      toast.error(errorMessage);
      return false;
    }
  }, [walletAddress]);

  // Query payment status
  const queryPaymentStatus = useCallback(async (checkoutRequestId: string): Promise<MpesaTransactionStatus | null> => {
    try {
      const response = await mpesaApi.queryPaymentStatus(checkoutRequestId);
      
      if (response.success && response.transaction) {
        const transaction = response.transaction;
        
        // Update local state based on transaction status
        setPaymentState(prev => ({
          ...prev,
          status: transaction.status as PaymentStatus,
          error: transaction.status === 'failed' ? 'Payment failed' : null
        }));

        return response;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error querying payment status:', error);
      return null;
    }
  }, []);

  // Start status polling
  const startStatusPolling = useCallback((checkoutRequestId: string) => {
    // Clear any existing polling
    stopStatusPolling();

    let pollCount = 0;
    const maxPolls = 40; // 40 polls * 3 seconds = 2 minutes

    const poll = async () => {
      pollCount++;
      
      try {
        const statusResponse = await queryPaymentStatus(checkoutRequestId);
        
        if (statusResponse?.success && statusResponse.transaction) {
          const status = statusResponse.transaction.status;
          
          if (status === 'completed') {
            stopStatusPolling();
            toast.success('Payment completed successfully!');
            return;
          } else if (status === 'failed' || status === 'cancelled') {
            stopStatusPolling();
            const message = status === 'cancelled' ? 'Payment was cancelled' : 'Payment failed';
            toast.error(message);
            return;
          }
        }
        
        // Continue polling if still pending and within limits
        if (pollCount < maxPolls) {
          pollingIntervalRef.current = setTimeout(poll, 3000); // Poll every 3 seconds
        } else {
          // Timeout after max polls
          setPaymentState(prev => ({
            ...prev,
            status: 'timeout',
            error: 'Payment request timed out'
          }));
          toast.error('Payment request timed out. Please try again.');
          stopStatusPolling();
        }
      } catch (error) {
        console.error('Error during status polling:', error);
        // Continue polling on error, but count it as an attempt
        if (pollCount < maxPolls) {
          pollingIntervalRef.current = setTimeout(poll, 3000);
        } else {
          stopStatusPolling();
        }
      }
    };

    // Start polling after 3 seconds (give M-Pesa time to process)
    pollingIntervalRef.current = setTimeout(poll, 3000);
    
    // Set overall timeout (2.5 minutes)
    pollingTimeoutRef.current = setTimeout(() => {
      setPaymentState(prev => ({
        ...prev,
        status: 'timeout',
        error: 'Payment request timed out'
      }));
      toast.error('Payment request timed out. Please try again.');
      stopStatusPolling();
    }, 150000); // 2.5 minutes
  }, [queryPaymentStatus]);

  // Stop status polling
  const stopStatusPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  // Reset payment state
  const resetPayment = useCallback(() => {
    stopStatusPolling();
    setPaymentState({
      status: 'idle',
      transactionId: null,
      checkoutRequestId: null,
      error: null,
      amount: null,
      loading: false
    });
  }, [stopStatusPolling]);

  return {
    paymentState,
    initiatePayment,
    queryPaymentStatus,
    resetPayment,
    startStatusPolling,
    stopStatusPolling
  };
}
