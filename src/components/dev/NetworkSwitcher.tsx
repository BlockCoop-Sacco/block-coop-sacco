import React, { useState } from 'react';
import { useWeb3 } from '../../providers/Web3Provider';
import { switchToNetwork } from '../../lib/appkit';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { AlertCircle, CheckCircle, Wifi, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface NetworkSwitcherProps {
  className?: string;
  showOnlyIfWrongNetwork?: boolean;
}

export function NetworkSwitcher({ 
  className = '', 
  showOnlyIfWrongNetwork = false 
}: NetworkSwitcherProps) {
  const { chainId, isConnected, isCorrectNetwork } = useWeb3();
  const [switching, setSwitching] = useState<number | null>(null);

  // Don't show if only showing for wrong network and network is correct
  if (showOnlyIfWrongNetwork && isCorrectNetwork) {
    return null;
  }

  const networks = [
    {
      chainId: 97,
      name: 'BSC Testnet',
      description: 'For development and testing',
      currency: 'tBNB',
      explorer: 'https://testnet.bscscan.com',
      color: 'blue'
    },
    {
      chainId: 56,
      name: 'BSC Mainnet',
      description: 'For production use',
      currency: 'BNB',
      explorer: 'https://bscscan.com',
      color: 'green'
    }
  ];

  const handleNetworkSwitch = async (targetChainId: number) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setSwitching(targetChainId);
    try {
      const success = await switchToNetwork(targetChainId);
      if (success) {
        const networkName = targetChainId === 56 ? 'BSC Mainnet' : 'BSC Testnet';
        toast.success(`Successfully switched to ${networkName}`);
      } else {
        toast.error('Failed to switch network. Please try manually in your wallet.');
      }
    } catch (error) {
      console.error('Network switch error:', error);
      toast.error('Network switch failed. Please try manually in your wallet.');
    } finally {
      setSwitching(null);
    }
  };

  const getCurrentNetworkInfo = () => {
    if (!isConnected) {
      return { name: 'Not Connected', icon: Wifi, color: 'gray' };
    }
    
    const network = networks.find(n => n.chainId === chainId);
    if (network) {
      return { 
        ...network, 
        icon: CheckCircle, 
        color: isCorrectNetwork ? network.color : 'red' 
      };
    }
    
    return { 
      name: `Unknown Network (${chainId})`, 
      icon: AlertCircle, 
      color: 'red' 
    };
  };

  const currentNetwork = getCurrentNetworkInfo();
  const CurrentIcon = currentNetwork.icon;

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CurrentIcon className={`w-5 h-5 text-${currentNetwork.color}-600`} />
          Network Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Network Display */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium">{currentNetwork.name}</p>
            {isConnected && (
              <p className="text-sm text-gray-600">
                Chain ID: {chainId}
              </p>
            )}
          </div>
          <Badge 
            variant={isCorrectNetwork ? 'success' : 'destructive'}
            className="ml-2"
          >
            {isConnected ? (isCorrectNetwork ? 'Supported' : 'Wrong Network') : 'Disconnected'}
          </Badge>
        </div>

        {/* Network Options */}
        {isConnected && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Switch Network:</p>
            {networks.map((network) => {
              const isCurrentNetwork = chainId === network.chainId;
              const isSwitching = switching === network.chainId;
              
              return (
                <Button
                  key={network.chainId}
                  variant={isCurrentNetwork ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleNetworkSwitch(network.chainId)}
                  disabled={isCurrentNetwork || isSwitching}
                >
                  {isSwitching ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <div className={`w-3 h-3 mr-2 rounded-full bg-${network.color}-500`} />
                  )}
                  <div className="text-left">
                    <div className="font-medium">{network.name}</div>
                    <div className="text-xs text-gray-500">{network.description}</div>
                  </div>
                  {isCurrentNetwork && (
                    <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                  )}
                </Button>
              );
            })}
          </div>
        )}

        {/* Help Text */}
        {!isConnected && (
          <p className="text-sm text-gray-600 text-center">
            Connect your wallet to switch networks
          </p>
        )}
        
        {isConnected && !isCorrectNetwork && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ You're connected to an unsupported network. Please switch to BSC Testnet or Mainnet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for development toolbar
export function NetworkSwitcherCompact() {
  const { chainId, isConnected, isCorrectNetwork } = useWeb3();
  
  if (!isConnected || isCorrectNetwork) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <NetworkSwitcher 
        className="w-80 shadow-lg border-2 border-yellow-400" 
        showOnlyIfWrongNetwork={true}
      />
    </div>
  );
}
