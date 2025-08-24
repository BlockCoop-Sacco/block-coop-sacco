import { useState, useEffect } from 'react';
import { CheckCircle, Clock, X, AlertCircle, Smartphone, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import mpesaApi from '../../services/mpesaApi';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'timeout';

interface PaymentStatusTrackerProps {
  transactionId?: string;
  checkoutRequestId?: string;
  onStatusChange?: (status: PaymentStatus) => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

interface TransactionDetails {
  id: string;
  status: PaymentStatus;
  amount: {
    usd: number;
    kes: number;
  };
  phoneNumber: string;
  createdAt: string;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
}

export function PaymentStatusTracker({
  transactionId,
  checkoutRequestId,
  onStatusChange,
  autoRefresh = true,
  refreshInterval = 5
}: PaymentStatusTrackerProps) {
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch transaction status
  const fetchStatus = async () => {
    if (!checkoutRequestId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await mpesaApi.queryPaymentStatus(checkoutRequestId);
      
      if (response.success && response.transaction) {
        setTransaction(response.transaction);
        setLastUpdated(new Date());
        
        // Notify parent component of status change
        if (onStatusChange) {
          onStatusChange(response.transaction.status as PaymentStatus);
        }
      } else {
        setError(response.error || 'Failed to fetch payment status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment status');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !checkoutRequestId) return;

    // Initial fetch
    fetchStatus();

    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      // Only continue refreshing if status is still pending
      if (transaction?.status === 'pending') {
        fetchStatus();
      }
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [checkoutRequestId, autoRefresh, refreshInterval, transaction?.status]);

  // Get status icon and color
  const getStatusDisplay = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          label: 'Pending',
          description: 'Waiting for M-Pesa confirmation'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Completed',
          description: 'Payment successful'
        };
      case 'failed':
        return {
          icon: X,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'Failed',
          description: 'Payment failed'
        };
      case 'cancelled':
        return {
          icon: X,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: 'Cancelled',
          description: 'Payment cancelled by user'
        };
      case 'timeout':
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          label: 'Timeout',
          description: 'Payment request timed out'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: 'Unknown',
          description: 'Unknown status'
        };
    }
  };

  if (!checkoutRequestId) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-gray-500">No payment to track</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !transaction) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            className="mt-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!transaction && loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading payment status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transaction) {
    return null;
  }

  const statusDisplay = getStatusDisplay(transaction.status);
  const StatusIcon = statusDisplay.icon;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${statusDisplay.bgColor}`}>
                <StatusIcon className={`h-5 w-5 ${statusDisplay.color}`} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-900">Payment Status</h3>
                  <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                    {statusDisplay.label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{statusDisplay.description}</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStatus}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Amount (USD)</p>
              <p className="font-medium">${transaction.amount.usd}</p>
            </div>
            <div>
              <p className="text-gray-500">Amount (KES)</p>
              <p className="font-medium">KES {transaction.amount.kes.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Phone Number</p>
              <p className="font-medium">{transaction.phoneNumber}</p>
            </div>
            <div>
              <p className="text-gray-500">Transaction ID</p>
              <p className="font-medium text-xs">{transaction.id.slice(0, 8)}...</p>
            </div>
          </div>

          {/* M-Pesa Receipt (if completed) */}
          {transaction.status === 'completed' && transaction.mpesaReceiptNumber && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">M-Pesa Receipt</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Receipt: {transaction.mpesaReceiptNumber}
              </p>
              {transaction.transactionDate && (
                <p className="text-xs text-green-600 mt-1">
                  Completed: {new Date(transaction.transactionDate).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-xs text-gray-400 text-center">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {/* Pending Status Instructions */}
          {transaction.status === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Smartphone className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Waiting for payment confirmation</p>
                  <p className="mt-1">
                    Please check your phone for the M-Pesa payment request and enter your PIN to complete the transaction.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Status */}
          {(transaction.status === 'failed' || transaction.status === 'timeout') && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">
                    {transaction.status === 'timeout' ? 'Payment Timeout' : 'Payment Failed'}
                  </p>
                  <p className="mt-1">
                    {transaction.status === 'timeout' 
                      ? 'The payment request timed out. Please try again.'
                      : 'The payment could not be completed. Please try again or contact support.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
