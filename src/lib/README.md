# BlockCoop Contract Integration System

This directory contains a comprehensive contract interaction system for the BlockCoop Sacco DApp, providing type-safe, React-integrated blockchain functionality.

## Overview

The contract system consists of two main files:
- `contracts.ts` - Core contract instances and utility functions
- `useContracts.ts` - React hooks for seamless component integration

## Core Features

### ✅ Typed Contract Instances
- Full TypeScript support with ethers.js Contract typing
- Automatic ABI loading from `src/abi/*.json` files
- Type-safe method calls and event handling

### ✅ Dynamic Provider/Signer Binding
- Read-only operations when no wallet is connected (JsonRpcProvider)
- Write operations when wallet is connected (Signer)
- Automatic error handling for connection states

### ✅ React Integration
- Custom hooks for common operations
- Wagmi compatibility
- Automatic state management

### ✅ Configuration Management
- Centralized contract addresses from `config.ts`
- BSC Testnet configuration
- Validation and error handling

## Contract Instances

### Direct Import Usage
```typescript
import { packageManager, shareToken, lpToken, vestingVault, taxManager, router } from './lib/contracts';

// Read-only operations (always available)
const packageData = await packageManager.getPackage(1);
const balance = await shareToken.balanceOf(userAddress);

// Write operations (requires connected wallet)
const signer = getSigner();
const contractsWithSigner = getContracts(signer);
const tx = await contractsWithSigner.packageManager.purchase(1, referrer);
```

### Available Contract Instances
- `packageManager` - Main investment package contract
- `shareToken` - Platform share token (ERC20)
- `lpToken` - Liquidity pool token (ERC20)
- `vestingVault` - Vesting management contract
- `taxManager` - Swap tax management contract
- `router` - PancakeSwap router for DEX operations

## React Hooks

### useContracts()
Returns read-only contract instances for data fetching:
```typescript
const contracts = useContracts();
const packages = await contracts.packageManager.getPackageIds();
```

### usePackages()
Hook for package-related operations:
```typescript
const { fetchPackages } = usePackages();
const packages = await fetchPackages();
```

### useBalances()
Hook for token balance operations:
```typescript
const { fetchBalances, address } = useBalances();
const balances = await fetchBalances(); // { usdt, share, lp }
```

### useVesting()
Hook for vesting-related operations:
```typescript
const { fetchVestingInfo, claimVested } = useVesting();
const vestingInfo = await fetchVestingInfo();
const tx = await claimVested();
```

### usePackagePurchase()
Hook for purchasing investment packages:
```typescript
const { purchasePackage } = usePackagePurchase();
const tx = await purchasePackage(packageId, referrerAddress);
```

### useRedemption()
Hook for LP token redemption:
```typescript
const { redeemLPTokens } = useRedemption();
const tx = await redeemLPTokens(amount);
```

### useAdminFunctions()
Hook for admin operations:
```typescript
const { createPackage, updatePackage, removePackage } = useAdminFunctions();
const tx = await createPackage(name, entryUSDT, exchangeRateBps, vestBps, cliff, duration, referralBps);
```

## Utility Functions

### Token Operations
```typescript
import { getTokenBalance, formatTokenAmount, parseTokenAmount } from './lib/contracts';

// Get any ERC20 token balance
const balance = await getTokenBalance(tokenAddress, userAddress);

// Format for display (BigNumber -> string)
const formatted = formatTokenAmount(balance, 18, 4); // "1234.5678"

// Parse user input (string -> BigNumber)
const amount = parseTokenAmount("100.5", 18);
```

### Package Operations
```typescript
import { getPackageById, getAllPackages, calculateSplits } from './lib/contracts';

// Get specific package
const package = await getPackageById(1);

// Get all packages
const packages = await getAllPackages();

// Calculate investment splits
const splits = calculateSplits(package);
// Returns: { totalTokens, vestTokens, poolTokens, usdtPool, usdtVault }
```

### Event Subscriptions
```typescript
import { subscribeToPackagePurchases, subscribeToVestingClaims } from './lib/contracts';

// Subscribe to package purchases
const unsubscribe = subscribeToPackagePurchases((packageId, buyer, amount) => {
  console.log(`Package ${packageId} purchased by ${buyer} for ${amount}`);
});

// Unsubscribe when component unmounts
unsubscribe();
```

## Error Handling

### Safe Contract Calls
```typescript
import { safeContractCall } from './lib/contracts';

const result = await safeContractCall(
  () => packageManager.getPackage(1),
  'Failed to get package'
);
// Returns null on error, logs error message
```

### Connection Validation
```typescript
import { validateContractConfig, checkNetworkConnection } from './lib/contracts';

// Check configuration
const { isConnected, hasValidConfig, errors } = validateContractConfig();

// Check network
const isCorrectNetwork = await checkNetworkConnection();
```

## Transaction Handling

### Wait for Confirmations
```typescript
import { waitForTransaction } from './lib/contracts';

const tx = await packageManager.purchase(1, referrer);
const receipt = await waitForTransaction(tx.hash, 2); // Wait for 2 confirmations
```

### Approval Pattern
```typescript
// Check allowance before spending
const allowance = await usdtToken.allowance(userAddress, spenderAddress);
if (allowance.lt(amount)) {
  const approveTx = await usdtToken.approve(spenderAddress, amount);
  await approveTx.wait();
}
```

## Example Component Usage

See `src/components/examples/ContractExample.tsx` for a complete example showing:
- Package listing and purchasing
- Balance checking
- Vesting token claiming
- LP token redemption
- Direct contract usage
- Error handling patterns

## Configuration

Ensure your `.env` file contains:
```
VITE_CHAIN_ID=97
VITE_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
VITE_PACKAGE_MANAGER_ADDRESS=0x...
VITE_SHARE_ADDRESS=0x...
VITE_LP_ADDRESS=0x...
VITE_VAULT_ADDRESS=0x...
VITE_TAX_ADDRESS=0x...
VITE_ROUTER_ADDRESS=0x...
VITE_USDT_ADDRESS=0x...
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

## Best Practices

1. **Always use hooks in React components** for automatic state management
2. **Handle loading states** during async operations
3. **Validate user input** before sending transactions
4. **Check allowances** before token transfers
5. **Wait for transaction confirmations** before updating UI
6. **Use error boundaries** to catch contract errors
7. **Subscribe to events** for real-time updates
8. **Validate network connection** before operations

## Troubleshooting

### Common Issues
- **"Contract not found"** - Check contract addresses in `.env`
- **"Insufficient allowance"** - Approve tokens before spending
- **"Wrong network"** - Ensure wallet is on BSC Testnet
- **"No signer"** - Connect wallet before write operations

### Debug Mode
Enable contract debugging by setting:
```typescript
// In browser console
localStorage.setItem('debug', 'contracts:*');
```
