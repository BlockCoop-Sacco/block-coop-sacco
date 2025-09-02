
import React, { useState, useEffect } from 'react';
import { Package, getContracts, getSigner } from '../../lib/contracts';
import { formatUSDT, formatPercentage, formatDuration } from '../../lib/utils';
import { useWeb3 } from '../../providers/Web3Provider';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PackageForm } from '../../components/admin/PackageForm';
import { GlobalTargetPriceManager } from '../../components/admin/GlobalTargetPriceManager';

import { Plus, Edit, Trash2, Package as PackageIcon, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';

export function PackagesPage() {
  const { isConnected, contracts } = useWeb3();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [togglingPackage, setTogglingPackage] = useState<number | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      if (!contracts.packageManager) {
        console.error('Package manager contract not available');
        toast.error('Package manager contract not available');
        return;
      }
      // Get package count and generate IDs
      const packageCount = await contracts.packageManager.nextPackageId();
      const packageIds = Array.from({ length: Number(packageCount) }, (_, i) => i);

      const packagePromises = packageIds.map(async (id: number) => {
        const pkg = await contracts.packageManager.getPackage(id);

        // Handle both array and object formats (same as PackageList)
        let packageData;
        if (Array.isArray(pkg)) {
          // Map according to contract struct: { entryUSDT, exchangeRate, cliff, duration, vestBps, referralBps, active, exists, name }
          packageData = {
            entryUSDT: pkg[0],
            exchangeRate: pkg[1],
            cliff: pkg[2],
            duration: pkg[3],
            vestBps: pkg[4],
            referralBps: pkg[5],
            active: pkg[6],
            exists: pkg[7],
            name: pkg[8]
          };
        } else {
          packageData = {
            name: pkg.name,
            entryUSDT: pkg.entryUSDT,
            exchangeRate: pkg.exchangeRate,
            vestBps: pkg.vestBps,
            cliff: pkg.cliff,
            duration: pkg.duration,
            referralBps: pkg.referralBps,
            active: pkg.active,
            exists: pkg.exists
          };
        }

        return {
          id: Number(id),
          name: packageData.name,
          entryUSDT: packageData.entryUSDT,
          exchangeRate: packageData.exchangeRate,
          vestBps: Number(packageData.vestBps),
          cliff: Number(packageData.cliff),
          duration: Number(packageData.duration),
          referralBps: Number(packageData.referralBps),
          active: packageData.active,
          exists: packageData.exists,
        };
      });
      
      const loadedPackages = await Promise.all(packagePromises);
      setPackages(loadedPackages);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setShowForm(true);
  };

  const handleTogglePackage = async (pkg: Package) => {
    if (!contracts.packageManager) {
      toast.error('Package manager contract not available');
      return;
    }

    try {
      setTogglingPackage(pkg.id);
      const signer = await getSigner();
      const contract = contracts.packageManager.connect(signer);
      
      const tx = await contract.togglePackage(pkg.id);
      await tx.wait();
      
      toast.success(`Package "${pkg.name}" ${pkg.active ? 'paused' : 'activated'} successfully!`);
      loadPackages(); // Refresh the packages list
    } catch (error) {
      console.error('Error toggling package:', error);
      toast.error(`Failed to ${pkg.active ? 'pause' : 'activate'} package "${pkg.name}"`);
    } finally {
      setTogglingPackage(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPackage(null);
    loadPackages();
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <PackageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Wallet Not Connected</h3>
          <p className="text-gray-600">Please connect your wallet to manage packages.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Package Management</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Package
        </Button>
      </div>

      {/* Dual Pricing System Notice */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <PackageIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Dual Pricing System</h3>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-blue-800">
            This system uses separate pricing mechanisms: <strong>Exchange Rates</strong> (set per package for user token allocations)
            and <strong>Global Target Price</strong> (used exclusively for liquidity pool operations).
          </p>
          <p className="text-sm text-blue-700 mt-2">
            Users see exchange rates when purchasing packages, while the global target price ensures consistent LP pricing across all operations.
          </p>
        </CardContent>
      </Card>

      {/* Global Target Price Management */}
      <GlobalTargetPriceManager onSuccess={() => {
        // Optionally refresh packages or show success message
        toast.success('Global target price updated successfully!');
      }} />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading packages...</p>
        </div>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <PackageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No packages found</h3>
            <p className="text-gray-600 mb-4">Create your first investment package to get started.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Package
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">All Packages</h3>
            <p className="text-sm text-gray-600">Manage all packages including active and inactive ones</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vest %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referral</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {packages.map((pkg) => (
                    <tr key={pkg.id} className={`hover:bg-gray-50 ${!pkg.active ? 'bg-gray-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div>
                          <div className={`font-medium ${!pkg.active ? 'text-gray-500' : 'text-gray-900'}`}>{pkg.name}</div>
                          <div className="text-sm text-gray-500">ID: {pkg.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={pkg.active ? "success" : "default"}>
                          {pkg.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${!pkg.active ? 'text-gray-500' : ''}`}>${formatUSDT(pkg.entryUSDT)}</span>
                        <div className="text-sm text-gray-500">USDT</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="info">{formatPercentage(pkg.vestBps)}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm ${!pkg.active ? 'text-gray-500' : ''}`}>{formatDuration(pkg.duration)}</span>
                        {pkg.cliff > 0 && (
                          <div className="text-xs text-gray-500">
                            Cliff: {formatDuration(pkg.cliff)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="success">{formatPercentage(pkg.referralBps)}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant={pkg.active ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleTogglePackage(pkg)}
                            disabled={togglingPackage === pkg.id}
                            className={pkg.active ? "text-orange-600 border-orange-600 hover:bg-orange-50" : "text-green-600 bg-green-600 hover:bg-green-700"}
                          >
                            {togglingPackage === pkg.id ? (
                              <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                            ) : pkg.active ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            {pkg.active ? 'Pause' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(pkg)}
                          >
                            <Edit className="h-3 w-3" />
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
      )}

      {showForm && (
        <PackageForm
          package={editingPackage}
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingPackage(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}


