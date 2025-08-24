import { useState, useEffect } from 'react';
import { Smartphone, AlertCircle, CheckCircle, Clock, X, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { PaymentStatusTracker } from './PaymentStatusTracker';
import { useMpesaPayment } from '../../hooks/useMpesaPayment';
import mpesaApi from '../../services/mpesaApi';
import toast from 'react-hot-toast';

interface MpesaPaymentFormProps {
  walletAddress: string;
  packageId: number;
  amount: number; // USD amount
  referrerAddress?: string;
  onSuccess: (transactionId: string) => void;
  onCancel: () => void;
}

type PaymentStep = 'input' | 'processing' | 'waiting' | 'completed' | 'failed';

export function MpesaPaymentForm({
  walletAddress,
  packageId,
  amount,
  referrerAddress,
  onSuccess,
  onCancel
}: MpesaPaymentFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<PaymentStep>('input');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  const { paymentState, initiatePayment, resetPayment } = useMpesaPayment();
  const kesAmount = Math.round(amount * 149.25);

  // Check backend connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Use the same API base URL as the M-Pesa service
        const API_BASE_URL = import.meta.env.VITE_MPESA_API_URL || 'https://api.blockcoopsacco.com/api';
        const healthUrl = API_BASE_URL.replace('/api', '/health');
        const response = await fetch(healthUrl);
        if (response.ok) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      } catch (error) {
        setConnectionStatus('disconnected');
      }
    };

    checkConnection();
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update step based on payment state
  useEffect(() => {
    switch (paymentState.status) {
      case 'idle':
        setStep('input');
        break;
      case 'initiating':
        setStep('processing');
        break;
      case 'pending':
        setStep('waiting');
        break;
      case 'completed':
        setStep('completed');
        if (paymentState.transactionId) {
          onSuccess(paymentState.transactionId);
        }
        break;
      case 'failed':
      case 'cancelled':
      case 'timeout':
        setStep('failed');
        break;
    }
  }, [paymentState.status, paymentState.transactionId, onSuccess]);

  // Format phone number as user types
  const handlePhoneNumberChange = (value: string) => {
    // Remove any non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format for display
    let formatted = cleaned;
    if (cleaned.startsWith('254')) {
      formatted = cleaned;
    } else if (cleaned.startsWith('0')) {
      formatted = '254' + cleaned.substring(1);
    } else if (cleaned.length <= 9) {
      formatted = '254' + cleaned;
    }
    
    setPhoneNumber(formatted);
  };

  // Validate phone number
  const isValidPhoneNumber = mpesaApi.validatePhoneNumber(phoneNumber);

  // Handle payment initiation
  const handleInitiatePayment = async () => {
    if (!isValidPhoneNumber) {
      toast.error('Please enter a valid Kenyan phone number');
      return;
    }

    const success = await initiatePayment({
      packageId,
      phoneNumber,
      amount,
      referrerAddress
    });

    if (!success) {
      setStep('failed');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    resetPayment();
    onCancel();
  };

  const renderConnectionStatus = () => {
    if (connectionStatus === 'checking') {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Checking M-Pesa service connection...</span>
        </div>
      );
    }

    if (connectionStatus === 'disconnected') {
      return (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <WifiOff className="w-4 h-4" />
          <span>M-Pesa service is currently unavailable. Please try again later.</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-4">
        <Wifi className="w-4 h-4" />
        <span>M-Pesa service is connected</span>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 'input':
        return (
          <div className="space-y-4">
            {renderConnectionStatus()}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                M-Pesa Phone Number
              </label>
              <Input
                type="tel"
                placeholder="254712345678"
                value={phoneNumber}
                onChange={(e) => handlePhoneNumberChange(e.target.value)}
                className={`${!isValidPhoneNumber && phoneNumber ? 'border-red-500' : ''}`}
                maxLength={12}
              />
              {phoneNumber && !isValidPhoneNumber && (
                <p className="text-xs text-red-600 mt-1">
                  Please enter a valid Kenyan phone number (254XXXXXXXXX)
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Enter your M-Pesa registered phone number
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Package Amount:</span>
                <span className="font-medium">${amount} USD</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-gray-600 dark:text-gray-400">M-Pesa Amount:</span>
                <span className="font-medium">KES {kesAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleInitiatePayment}
                disabled={!isValidPhoneNumber || paymentState.loading || connectionStatus === 'disconnected'}
                loading={paymentState.loading}
                className="w-full sm:flex-1"
                size="lg"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Send Payment Request</span>
                <span className="sm:hidden">Send Request</span>
              </Button>
              <Button variant="outline" onClick={handleCancel} className="w-full sm:flex-1" size="lg">
                Cancel
              </Button>
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Initiating Payment
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Please wait while we process your request...
              </p>
            </div>
          </div>
        );

      case 'waiting':
        return (
          <div className="space-y-4">
            <PaymentStatusTracker
              checkoutRequestId={paymentState.checkoutRequestId || undefined}
              onStatusChange={(status) => {
                if (status === 'completed' && paymentState.transactionId) {
                  onSuccess(paymentState.transactionId);
                }
              }}
              autoRefresh={true}
            />

            <Button variant="outline" onClick={handleCancel} className="w-full">
              Cancel Payment
            </Button>
          </div>
        );

      case 'completed':
        return (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Payment Successful!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your M-Pesa payment has been completed successfully
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Your USDT package is being processed...
              </p>
            </div>

            {paymentState.transactionId && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xs text-green-700 dark:text-green-300">
                  Transaction ID: {paymentState.transactionId}
                </p>
              </div>
            )}
          </div>
        );

      case 'failed':
        const errorMessage = paymentState.error || 'Something went wrong with your payment';
        const isConnectionError = errorMessage.includes('connect') || errorMessage.includes('network') || connectionStatus === 'disconnected';

        return (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              {isConnectionError ? (
                <WifiOff className="h-16 w-16 text-red-600" />
              ) : (
                <X className="h-16 w-16 text-red-600" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {isConnectionError ? 'Connection Error' : 'Payment Failed'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {errorMessage}
              </p>

              {isConnectionError && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-left">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium mb-2">
                    Troubleshooting steps:
                  </p>
                  <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
                    <li>• Check your internet connection</li>
                    <li>• Make sure the M-Pesa backend server is running</li>
                    <li>• Try refreshing the page</li>
                    <li>• Contact support if the issue persists</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button onClick={() => {
                resetPayment();
                setStep('input');
              }} className="flex-1">
                Try Again
              </Button>
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-4 sm:mb-6">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              M-Pesa Payment
            </h2>
          </div>
          <Badge variant="secondary" className="self-start sm:self-auto">Mobile Money</Badge>
        </div>

        {renderStepContent()}
      </CardContent>
    </Card>
  );
}
