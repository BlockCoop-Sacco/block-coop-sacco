import { useAppKitAccount, useAppKitNetwork, useAppKitProvider, useAppKitState } from '@reown/appkit/react';
import { useWeb3 } from '../../providers/Web3Provider';
import { getAppKitState } from '../../lib/appkit';

export function AppKitDebug() {
  // AppKit hooks
  const { address, isConnected: appKitIsConnected } = useAppKitAccount();
  const { chainId: appKitChainId } = useAppKitNetwork();
  const { walletProvider } = useAppKitProvider('eip155');
  const { initialized, loading, open, selectedNetworkId, activeChain } = useAppKitState();

  // Web3Provider state
  const web3State = useWeb3();

  // Get AppKit internal state
  const appKitInternalState = getAppKitState();

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-md text-xs">
      <h3 className="font-bold mb-2">🔍 AppKit Debug Info</h3>
      
      <div className="space-y-2">
        <div>
          <strong>AppKit Hooks State:</strong>
          <div className="ml-2">
            <div>isConnected: {String(appKitIsConnected)}</div>
            <div>address: {address || 'undefined'}</div>
            <div>chainId: {appKitChainId || 'undefined'}</div>
            <div>walletProvider: {walletProvider ? 'present' : 'undefined'}</div>
            <div>walletProvider type: {typeof walletProvider}</div>
            <div>has request method: {walletProvider && 'request' in walletProvider ? 'yes' : 'no'}</div>
          </div>
        </div>

        <div>
          <strong>AppKit State:</strong>
          <div className="ml-2">
            <div>initialized: {String(initialized)}</div>
            <div>loading: {String(loading)}</div>
            <div>open: {String(open)}</div>
            <div>selectedNetworkId: {selectedNetworkId || 'undefined'}</div>
            <div>activeChain: {activeChain || 'undefined'}</div>
          </div>
        </div>

        <div>
          <strong>AppKit Internal State:</strong>
          <div className="ml-2 text-xs">
            <div>State keys: {Object.keys(appKitInternalState || {}).join(', ')}</div>
          </div>
        </div>
        
        <div>
          <strong>Web3Provider State:</strong>
          <div className="ml-2">
            <div>isConnected: {String(web3State.isConnected)}</div>
            <div>account: {web3State.account || 'null'}</div>
            <div>chainId: {web3State.chainId || 'null'}</div>
            <div>hasProvider: {String(!!web3State.provider)}</div>
            <div>hasSigner: {String(!!web3State.signer)}</div>
            <div>isInitializing: {String(web3State.isInitializing)}</div>
            <div>error: {web3State.error || 'none'}</div>
          </div>
        </div>
        
        <div>
          <strong>Window Ethereum:</strong>
          <div className="ml-2">
            <div>available: {typeof window !== 'undefined' && (window as any).ethereum ? 'yes' : 'no'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
