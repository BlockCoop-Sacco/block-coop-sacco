import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../providers/Web3Provider';

import { formatAddress } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Percent, Plus, Settings, Wallet, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface TaxBucket {
  key: string;
  rateBps: number;
  recipient: string;
}

export function TaxesPage() {
  const { account: address, signer, isConnected, isCorrectNetwork, contracts } = useWeb3();
  const [buckets, setBuckets] = useState<TaxBucket[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBucket, setEditingBucket] = useState<TaxBucket | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    rateBps: '',
    recipient: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingBuckets, setLoadingBuckets] = useState(false);

  // Common tax bucket keys for easy selection
  const commonBucketKeys = ['buy', 'sell', 'transfer', 'marketing', 'development', 'treasury'];

  useEffect(() => {
    if (address && isConnected) {
      loadTaxBuckets();
    }
  }, [address, isConnected]);

  const loadTaxBuckets = async () => {
    try {
      setLoadingBuckets(true);
      // Use contracts from Web3Provider context (read-only is fine for loading)

      // Load common bucket keys to check which ones are configured
      const bucketPromises = commonBucketKeys.map(async (key) => {
        try {
          const keyBytes = ethers.encodeBytes32String(key);
          const bucket = await contracts.taxManager.buckets(keyBytes);

          // Only include buckets that have been configured (non-zero rate or non-zero address)
          if (Number(bucket.rateBps) > 0 || bucket.recipient !== ethers.ZeroAddress) {
            return {
              key,
              rateBps: Number(bucket.rateBps), // Convert BigInt to number
              recipient: bucket.recipient,
            };
          }
          return null;
        } catch (error) {
          console.error(`Error loading bucket ${key}:`, error);
          return null;
        }
      });

      const loadedBuckets = (await Promise.all(bucketPromises)).filter(Boolean) as TaxBucket[];
      setBuckets(loadedBuckets);
    } catch (error) {
      console.error('Error loading tax buckets:', error);
      toast.error('Failed to load tax buckets');
    } finally {
      setLoadingBuckets(false);
    }
  };

  const validateForm = () => {
    if (!formData.key.trim()) {
      throw new Error('Bucket key is required');
    }

    const rateBps = parseInt(formData.rateBps);
    if (isNaN(rateBps) || rateBps < 0 || rateBps > 10000) {
      throw new Error('Tax rate must be between 0 and 10000 basis points (0-100%)');
    }

    if (!ethers.isAddress(formData.recipient)) {
      throw new Error('Invalid recipient address');
    }

    return { rateBps };
  };

  const resetForm = () => {
    setFormData({ key: '', rateBps: '', recipient: '' });
    setEditingBucket(null);
    setShowForm(false);
  };

  const handleEdit = (bucket: TaxBucket) => {
    setEditingBucket(bucket);
    setFormData({
      key: bucket.key,
      rateBps: bucket.rateBps.toString(),
      recipient: bucket.recipient,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Validate form data
      const { rateBps } = validateForm();

      // Check wallet connection and signer availability
      if (!isConnected) throw new Error('Please connect your wallet first');
      if (!signer) throw new Error('No signer available - please ensure your wallet is connected');
      if (!isCorrectNetwork) throw new Error('Wrong network. Please switch to BSC Testnet');
      if (!contracts?.taxManager) throw new Error('Tax manager contract not properly initialized');

      // Convert key to bytes32 for contract call
      const keyBytes = ethers.encodeBytes32String(formData.key);

      const tx = await contracts.taxManager.setBucket(
        keyBytes,
        rateBps,
        formData.recipient
      );

      const actionText = editingBucket ? 'Updating' : 'Setting';
      toast.loading(`${actionText} tax bucket...`, { id: 'tax' });

      await tx.wait();

      toast.success(`Tax bucket ${editingBucket ? 'updated' : 'configured'} successfully!`, { id: 'tax' });

      // Reload buckets from contract to ensure consistency
      await loadTaxBuckets();

      resetForm();
    } catch (error: any) {
      console.error('Tax bucket error:', error);
      toast.error(error.message || 'Failed to set tax bucket', { id: 'tax' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (bucket: TaxBucket) => {
    if (!confirm(`Are you sure you want to remove the "${bucket.key}" tax bucket?`)) {
      return;
    }

    try {
      setLoading(true);

      // Check wallet connection and signer availability
      if (!isConnected) throw new Error('Please connect your wallet first');
      if (!signer) throw new Error('No signer available - please ensure your wallet is connected');
      if (!isCorrectNetwork) throw new Error('Wrong network. Please switch to BSC Testnet');
      if (!contracts?.taxManager) throw new Error('Tax manager contract not properly initialized');
      const keyBytes = ethers.encodeBytes32String(bucket.key);

      // Set rate to 0 and recipient to zero address to effectively remove
      const tx = await contracts.taxManager.setBucket(
        keyBytes,
        0,
        ethers.ZeroAddress
      );

      toast.loading('Removing tax bucket...', { id: 'tax-remove' });
      await tx.wait();
      toast.success('Tax bucket removed successfully!', { id: 'tax-remove' });

      // Reload buckets
      await loadTaxBuckets();
    } catch (error: any) {
      console.error('Remove tax bucket error:', error);
      toast.error(error.message || 'Failed to remove tax bucket', { id: 'tax-remove' });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Wallet Not Connected</h3>
            <p className="text-gray-600">Please connect your wallet to manage tax buckets.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Tax Bucket Management</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Configure and manage tax buckets for swap fees and distributions across different transaction types.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">Tax Buckets</h2>
          {loadingBuckets && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
              Loading buckets...
            </div>
          )}
        </div>
        <Button onClick={() => setShowForm(true)} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tax Bucket
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              {editingBucket ? 'Edit Tax Bucket' : 'Configure Tax Bucket'}
            </h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Input
                    label="Bucket Key"
                    value={formData.key}
                    onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                    placeholder="e.g., buy, sell, marketing"
                    required
                    disabled={!!editingBucket}
                  />
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Common keys:</p>
                    <div className="flex flex-wrap gap-1">
                      {commonBucketKeys.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, key }))}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                          disabled={!!editingBucket}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Input
                    label="Tax Rate (Basis Points)"
                    type="number"
                    value={formData.rateBps}
                    onChange={(e) => setFormData(prev => ({ ...prev, rateBps: e.target.value }))}
                    placeholder="500"
                    min="0"
                    max="10000"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.rateBps ? `${(parseInt(formData.rateBps) / 100).toFixed(1)}%` : '0-10000 BPS (0-100%)'}
                  </p>
                </div>

                <div>
                  <Input
                    label="Recipient Address"
                    value={formData.recipient}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
                    placeholder="0x..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Address that will receive the tax fees
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button type="submit" loading={loading}>
                  {editingBucket ? 'Update' : 'Set'} Tax Bucket
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {buckets.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Active Tax Buckets</h3>
              <Badge variant="info">{buckets.length} bucket{buckets.length !== 1 ? 's' : ''}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bucket Key</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient Address</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {buckets.map((bucket) => (
                    <tr key={bucket.key} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-medium text-gray-900">{bucket.key}</span>
                          <div className="text-sm text-gray-500 capitalize">
                            {bucket.key.replace(/([A-Z])/g, ' $1').trim()} transactions
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Badge variant="info">{(bucket.rateBps / 100).toFixed(1)}%</Badge>
                          <span className="text-xs text-gray-500">({bucket.rateBps} BPS)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-sm font-mono text-gray-900">
                            {formatAddress(bucket.recipient)}
                          </span>
                          <div className="text-xs text-gray-500">
                            Fee recipient wallet
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(bucket)}
                            disabled={loading}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemove(bucket)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : !loadingBuckets ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Percent className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tax buckets configured</h3>
            <p className="text-gray-600 mb-4">Set up tax buckets to manage swap fees and distributions across different transaction types.</p>
            <Button onClick={() => setShowForm(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Configure First Bucket
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}