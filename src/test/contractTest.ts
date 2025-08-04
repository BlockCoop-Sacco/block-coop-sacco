/**
 * Simple contract connection test
 * This file tests basic contract connectivity and configuration
 */

import { appKitConfig } from '../lib/appkit';
import { getProvider, getContracts } from '../lib/contracts';

export async function testContractConnections() {
  console.log('🔧 Testing contract connections...');
  
  try {
    // Test 1: Check configuration
    console.log('📋 Configuration check:');
    console.log('  Chain ID:', appKitConfig.chainId);
    console.log('  RPC URL:', appKitConfig.rpcUrl);
    console.log('  Package Manager:', appKitConfig.contracts.packageManager);
    console.log('  USDT Address:', appKitConfig.contracts.usdt);
    console.log('  BLOCKS Address:', appKitConfig.contracts.share);
    
    // Test 2: Provider connection
    console.log('\n🌐 Provider connection test:');
    const provider = getProvider();
    const network = await provider.getNetwork();
    console.log('  Connected to chain ID:', Number(network.chainId));
    console.log('  Network name:', network.name);
    
    // Test 3: Contract instances
    console.log('\n📄 Contract instances test:');
    const contracts = getContracts();
    console.log('  Package Manager:', !!contracts.packageManager);
    console.log('  USDT Token:', !!contracts.usdtToken);
    console.log('  BLOCKS Token:', !!contracts.shareToken);
    console.log('  BLOCKS-LP Token:', !!contracts.lpToken);
    console.log('  Vesting Vault:', !!contracts.vestingVault);
    
    // Test 4: Basic contract calls
    console.log('\n🔍 Basic contract calls test:');
    try {
      const packageCount = await contracts.packageManager.nextPackageId();
      console.log('  Next Package ID:', Number(packageCount));
      
      const usdtName = await contracts.usdtToken.name();
      console.log('  USDT Token Name:', usdtName);
      
      const blocksName = await contracts.shareToken.name();
      console.log('  BLOCKS Token Name:', blocksName);
      
      console.log('\n✅ All contract connection tests passed!');
      return true;
    } catch (contractError) {
      console.error('❌ Contract call failed:', contractError);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Contract connection test failed:', error);
    return false;
  }
}

// Auto-run test in development
if (import.meta.env.DEV) {
  testContractConnections().then(success => {
    if (success) {
      console.log('🎉 Contract connectivity verified!');
    } else {
      console.error('🚨 Contract connectivity issues detected!');
    }
  });
}
