import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ExternalLink, Copy, Users, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { formatBLOCKS, formatAddress } from '../../lib/utils';
import { getTransactionUrl } from '../../lib/transactionErrors';
import toast from 'react-hot-toast';

interface ReferralTransaction {
  referrer: string;
  buyer: string;
  reward: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

interface ReferralHistoryTableProps {
  transactions: ReferralTransaction[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function ReferralHistoryTable({ 
  transactions, 
  loading = false, 
  onRefresh 
}: ReferralHistoryTableProps) {
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - (timestamp * 1000);
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const copyTransactionHash = async (txHash: string) => {
    const { copyToClipboardWithFeedback } = await import('../../lib/referral');
    const success = await copyToClipboardWithFeedback(
      txHash,
      'Transaction hash copied!',
      'Failed to copy transaction hash'
    );

    if (success) {
      setCopiedTx(txHash);
      setTimeout(() => setCopiedTx(null), 2000);
    }
  };

  const openTransaction = (txHash: string) => {
    const url = getTransactionUrl(txHash);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Referral History</h3>
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Referral History</h3>
            <p className="text-sm text-gray-600 mt-1">
              Track all your referral rewards and transactions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {transactions.length} Referrals
            </Badge>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Referrals Yet</h4>
            <p className="text-gray-600 mb-4">
              Start sharing your referral link to earn rewards when others join BlockCoop!
            </p>
            <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-blue-700">
                💡 <strong>Tip:</strong> Share your referral link on social media, 
                with friends, or in crypto communities to maximize your earnings.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Buyer</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Reward</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => (
                    <tr key={`${tx.transactionHash}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{formatAddress(tx.buyer)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyTransactionHash(tx.buyer)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-700">
                            {formatBLOCKS(tx.reward)} BLOCKS
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm">{formatTimeAgo(tx.timestamp)}</span>
                          <span className="text-xs text-gray-500">{formatDate(tx.timestamp)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-600">
                            {tx.transactionHash.slice(0, 8)}...
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyTransactionHash(tx.transactionHash)}
                            className="h-6 w-6 p-0"
                          >
                            {copiedTx === tx.transactionHash ? (
                              <span className="text-green-600 text-xs">✓</span>
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTransaction(tx.transactionHash)}
                            className="h-6 w-6 p-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {transactions.map((tx, index) => (
                <div key={`${tx.transactionHash}-${index}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-700">
                        {formatBLOCKS(tx.reward)} BLOCKS
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{formatTimeAgo(tx.timestamp)}</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Buyer:</span>
                      <span className="font-mono">{formatAddress(tx.buyer)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{formatDate(tx.timestamp)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="font-mono text-xs text-gray-600">
                      {tx.transactionHash.slice(0, 12)}...
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyTransactionHash(tx.transactionHash)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedTx === tx.transactionHash ? (
                          <span className="text-green-600 text-xs">✓</span>
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTransaction(tx.transactionHash)}
                        className="h-8 w-8 p-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
