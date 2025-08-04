import React from 'react';
import { useWeb3 } from '../../providers/Web3Provider';
import { Badge } from './Badge';
import { AlertCircle, CheckCircle, Wifi } from 'lucide-react';

interface NetworkIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function NetworkIndicator({ className = '', showLabel = true }: NetworkIndicatorProps) {
  const { chainId, isConnected, isCorrectNetwork } = useWeb3();

  if (!isConnected) {
    return (
      <Badge variant="secondary" className={`flex items-center gap-1 ${className}`}>
        <Wifi className="w-3 h-3" />
        {showLabel && 'Not Connected'}
      </Badge>
    );
  }

  const getNetworkInfo = () => {
    switch (chainId) {
      case 56:
        return {
          name: 'BSC Mainnet',
          variant: 'success' as const,
          icon: CheckCircle,
          color: 'text-green-600'
        };
      case 97:
        return {
          name: 'BSC Testnet',
          variant: 'info' as const,
          icon: CheckCircle,
          color: 'text-blue-600'
        };
      default:
        return {
          name: `Chain ${chainId}`,
          variant: 'destructive' as const,
          icon: AlertCircle,
          color: 'text-red-600'
        };
    }
  };

  const networkInfo = getNetworkInfo();
  const Icon = networkInfo.icon;

  return (
    <Badge 
      variant={isCorrectNetwork ? networkInfo.variant : 'destructive'} 
      className={`flex items-center gap-1 ${className}`}
    >
      <Icon className={`w-3 h-3 ${networkInfo.color}`} />
      {showLabel && (
        <span>
          {isCorrectNetwork ? networkInfo.name : `Wrong Network (${networkInfo.name})`}
        </span>
      )}
    </Badge>
  );
}

// Compact version for headers/navbars
export function NetworkIndicatorCompact({ className = '' }: { className?: string }) {
  return <NetworkIndicator className={className} showLabel={false} />;
}
