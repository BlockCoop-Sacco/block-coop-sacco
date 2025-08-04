import { useState, useEffect } from 'react';
import { Clock, CheckCircle, X, AlertCircle, Smartphone, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useWeb3 } from '../../providers/Web3Provider';
import mpesaApi from '../../services/mpesaApi';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  packageId: number;
  amount: {
    usd: number;
    kes: number;
  };
  phoneNumber: string;
  status: string;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  createdAt: string;
}

interface TransactionStats {
  totalTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalAmountUsd: number;
  totalAmountKes: number;
}

interface TransactionHistoryProps {
  limit?: number;
  showStats?: boolean;
  autoRefresh?: boolean;
}

export function TransactionHistory({ 
  limit = 10, 
  showStats = true, 
  autoRefresh = false 
}: TransactionHistoryProps) {
  const { account: walletAddress } = useWeb3();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  // Fetch transaction history
  const fetchTransactions = async (reset = false) => {
    if (!walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      const response = await mpesaApi.getTransactionHistory(walletAddress, limit, currentOffset);

      if (response.success) {
        if (reset) {
          setTransactions(response.transactions || []);
          setOffset(0);
        } else {
          setTransactions(prev => [...prev, ...(response.transactions || [])]);
        }
        
        if (showStats && response.stats) {
          setStats(response.stats);
        }
      } else {
        setError(response.error || 'Failed to fetch transaction history');
        toast.error('Failed to load transaction history');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transaction history');
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  // Load more transactions
  const loadMore = () => {
    setOffset(prev => prev + limit);
  };

  // Auto-refresh effect
  useEffect(() => {
    if (walletAddress) {
      fetchTransactions(true);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (offset > 0) {
      fetchTransactions(false);
    }
  }, [offset]);

  useEffect(() => {
    if (!autoRefresh || !walletAddress) return;

    const interval = setInterval(() => {
      fetchTransactions(true);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, walletAddress]);

  // Get status display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          label: 'Pending'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Completed'
        };
      case 'failed':
        return {
          icon: X,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'Failed'
        };
      case 'cancelled':
        return {
          icon: X,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: 'Cancelled'
        };
      case 'timeout':
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          label: 'Timeout'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: 'Unknown'
        };
    }
  };

  if (!walletAddress) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Please connect your wallet to view transaction history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {showStats && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</div>
              <div className="text-sm text-gray-500">Total Transactions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completedTransactions}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">${stats.totalAmountUsd.toFixed(2)}</div>
              <div className="text-sm text-gray-500">Total USD</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">KES {stats.totalAmountKes.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total KES</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction List */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">M-Pesa Transaction History</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchTransactions(true)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {transactions.length === 0 && !loading ? (
            <div className="text-center py-8">
              <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No M-Pesa transactions found</p>
              <p className="text-sm text-gray-400 mt-1">
                Your M-Pesa payment history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const statusDisplay = getStatusDisplay(transaction.status);
                const StatusIcon = statusDisplay.icon;

                return (
                  <div
                    key={transaction.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${statusDisplay.bgColor}`}>
                          <StatusIcon className={`h-4 w-4 ${statusDisplay.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              Package #{transaction.packageId}
                            </span>
                            <Badge variant="secondary">
                              {statusDisplay.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(transaction.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          ${transaction.amount.usd}
                        </div>
                        <div className="text-sm text-gray-500">
                          KES {transaction.amount.kes.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <span className="ml-2 text-gray-900">{transaction.phoneNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Transaction ID:</span>
                        <span className="ml-2 text-gray-900 font-mono text-xs">
                          {transaction.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>

                    {transaction.mpesaReceiptNumber && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded p-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-green-700 font-medium">M-Pesa Receipt:</span>
                            <span className="ml-2 text-green-800">{transaction.mpesaReceiptNumber}</span>
                          </div>
                          {transaction.transactionDate && (
                            <div className="text-xs text-green-600">
                              {new Date(transaction.transactionDate).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Load More Button */}
              {transactions.length >= limit && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
