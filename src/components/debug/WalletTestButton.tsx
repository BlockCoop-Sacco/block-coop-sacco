import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useWeb3 } from '../../providers/Web3Provider';

export function WalletTestButton() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { connectWallet } = useWeb3();

  const handleConnect = async () => {
    console.log('🔘 Connect button clicked');
    console.log('🔘 Current state before connect:', {
      isConnected,
      address,
      hasWalletProvider: !!walletProvider
    });
    
    try {
      await connectWallet();
      console.log('🔘 Connect wallet called');
    } catch (error) {
      console.error('🔘 Connect wallet error:', error);
    }
  };

  const handleTestProvider = async () => {
    console.log('🧪 Testing wallet provider...');
    
    if (walletProvider && typeof walletProvider === 'object' && 'request' in walletProvider) {
      try {
        const accounts = await walletProvider.request({ method: 'eth_accounts' });
        console.log('🧪 Accounts from provider:', accounts);
        
        const chainId = await walletProvider.request({ method: 'eth_chainId' });
        console.log('🧪 Chain ID from provider:', chainId);
      } catch (error) {
        console.error('🧪 Provider test error:', error);
      }
    } else {
      console.log('🧪 No valid wallet provider available');
    }
  };

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg">
      <h3 className="font-bold mb-2">🧪 Wallet Test</h3>
      <div className="space-y-2">
        <div className="text-xs">
          <div>Connected: {String(isConnected)}</div>
          <div>Address: {address || 'none'}</div>
          <div>Provider: {walletProvider ? 'present' : 'none'}</div>
        </div>
        <div className="space-y-1">
          <button
            onClick={handleConnect}
            className="w-full px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            Connect Wallet
          </button>
          <button
            onClick={handleTestProvider}
            className="w-full px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
          >
            Test Provider
          </button>
        </div>
      </div>
    </div>
  );
}
