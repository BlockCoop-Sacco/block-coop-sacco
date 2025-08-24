import React from 'react';
import { useNetworkValidation } from '../../hooks/useNetworkValidation';
import { Button } from './Button';
import { Badge } from './Badge';
import { AlertTriangle, CheckCircle, WifiOff, Loader2 } from 'lucide-react';

interface NetworkStatusProps {
  showSwitchButton?: boolean;
  compact?: boolean;
  className?: string;
}

export function NetworkStatus({
  showSwitchButton = true,
  compact = false,
  className = ''
}: NetworkStatusProps) {
  const {
    isCorrectNetwork,
    isConnected,
    currentChainId,
    targetChainId,
    isLoading,
    switchToBSCTestnet,
    getNetworkStatus,
    canSwitch,
  } = useNetworkValidation();

  const networkStatus = getNetworkStatus();

  if (!isConnected) {
    if (compact) {
      return (
        <div className={`flex items-center space-x-2 ${className}`}>
          <WifiOff className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">Not connected</span>
        </div>
      );
    }
    return null;
  }

  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    switch (networkStatus.status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'wrong-network':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'switching':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case 'disconnected':
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getBadgeVariant = () => {
    switch (networkStatus.status) {
      case 'connected':
        return 'success';
      case 'wrong-network':
        return 'error';
      case 'switching':
        return 'warning';
      case 'disconnected':
      default:
        return 'default';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStatusIcon()}
        <Badge variant={getBadgeVariant()}>
          {isCorrectNetwork ? (targetChainId === 56 ? 'BSC Mainnet' : 'BSC Testnet') : `Chain ${currentChainId}`}
        </Badge>
        {!isCorrectNetwork && showSwitchButton && canSwitch && (
          <Button
            size="sm"
            variant="outline"
            onClick={switchToBSCTestnet}
            disabled={isLoading}
            className="text-xs"
          >
            Switch
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              Network Status
            </h3>
            <p className="text-sm text-gray-600">
              {networkStatus.message}
            </p>
          </div>
        </div>
        
        {!isCorrectNetwork && showSwitchButton && canSwitch && (
          <Button
            onClick={switchToBSCTestnet}
            disabled={isLoading}
            className="ml-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Switching...
              </>
            ) : (
              targetChainId === 56 ? 'Switch to BSC Mainnet' : 'Switch to BSC Testnet'
            )}
          </Button>
        )}
      </div>

      {!isCorrectNetwork && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-yellow-800 font-medium">
                Wrong Network Detected
              </p>
              <p className="text-yellow-700 mt-1">
                This DApp requires {targetChainId === 56 ? 'BSC Mainnet' : 'BSC Testnet'} (Chain ID: {targetChainId}).
                {canSwitch 
                  ? ' Please switch your network to continue using the application.'
                  : ' Please manually switch your wallet to BSC Testnet.'
                }
              </p>
              {!canSwitch && (
                <div className="mt-2 text-xs text-yellow-600">
                  <p><strong>Manual Setup Instructions:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Network Name: {targetChainId === 56 ? 'BSC Mainnet' : 'BSC Testnet'}</li>
                    <li>RPC URL: {targetChainId === 56 ? 'https://bsc-dataseed1.binance.org/' : 'https://data-seed-prebsc-1-s1.binance.org:8545/'}</li>
                    <li>Chain ID: {targetChainId}</li>
                    <li>Symbol: {targetChainId === 56 ? 'BNB' : 'tBNB'}</li>
                    <li>Block Explorer: {targetChainId === 56 ? 'https://bscscan.com' : 'https://testnet.bscscan.com'}</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simplified network indicator for headers/navbars
export function NetworkIndicator({ className = '' }: { className?: string }) {
  return (
    <NetworkStatus
      compact
      showSwitchButton={false}
      className={className}
    />
  );
}

// Ultra-compact network indicator for mobile headers (icon only)
export function MobileNetworkIndicator({ className = '' }: { className?: string }) {
  const {
    isConnected,
    isLoading,
    getNetworkStatus,
  } = useNetworkValidation();

  const networkStatus = getNetworkStatus();

  if (!isConnected) {
    return (
      <div className={`flex items-center justify-center min-h-[44px] min-w-[44px] ${className}`}>
        <WifiOff className="h-5 w-5 text-gray-400" />
      </div>
    );
  }

  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />;
    }

    switch (networkStatus.status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'wrong-network':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'switching':
        return <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />;
      case 'disconnected':
      default:
        return <WifiOff className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div
      className={`flex items-center justify-center min-h-[44px] min-w-[44px] ${className}`}
      title={networkStatus.message}
    >
      {getStatusIcon()}
    </div>
  );
}

// Network guard component that blocks content when on wrong network
interface NetworkGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function NetworkGuard({ children, fallback }: NetworkGuardProps) {
  const { isCorrectNetwork, isConnected } = useNetworkValidation();

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Wallet Not Connected
        </h3>
        <p className="text-gray-600">
          Please connect your wallet to use this feature.
        </p>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return fallback || <NetworkStatus />;
  }

  return <>{children}</>;
}
