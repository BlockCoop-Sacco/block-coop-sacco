# SecondaryMarket Contract Deployment Guide

## Overview
This guide will help you deploy the SecondaryMarket smart contract to BSC Mainnet to enable trading functionality on the BlockCoop Sacco platform.

## Prerequisites
- ✅ Core contracts already deployed (BLOCKS token, PackageManager, etc.)
- ✅ Hardhat environment configured for BSC Mainnet
- ✅ Private key with sufficient BNB for gas fees
- ✅ Access to BSC Mainnet RPC

## Deployment Steps

### 1. Environment Setup
Ensure your `.env` file has the required variables:

```bash
# BSC Mainnet Configuration
BSC_MAINNET_RPC=https://bsc-dataseed1.binance.org/
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_bscscan_api_key

# Existing Contract Addresses (from deployments-mainnet-v2_2.json)
ROUTER_ADDRESS=0x10ed43c718714eb63d5aa57b78b54704e256024e
FACTORY_ADDRESS=0xca143ce32fe78f1f7019d7d551a6402fc5350c73
MAINNET_USDT=0x55d398326f99059ff775485246999027b3197955
TREASURY_ADDRESS=0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4
```

### 2. Deploy SecondaryMarket Contract

Run the deployment script:

```bash
npx hardhat run scripts/deploy-secondary-market.cjs --network bscmainnet
```

**Expected Output:**
```
🚀 Deploying SecondaryMarket contract
Network: bscmainnet
Deployer: 0x...
Deployment Configuration:
- Router: 0x10ed43c718714eb63d5aa57b78b54704e256024e
- Factory: 0xca143ce32fe78f1f7019d7d551a6402fc5350c73
- USDT: 0x55d398326f99059ff775485246999027b3197955
- BLOCKS Token: 0x292E1B8CBE91623E71D6532e6BE6B881Cc0a9c31
- Treasury: 0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4
- Initial Target Price: 2.0 USDT per BLOCKS

1️⃣ Deploying SecondaryMarket...
✅ SecondaryMarket deployed at: 0x...

2️⃣ Verifying contract deployment...
✅ Contract verification:
   - Target Price: 2.0 USDT per BLOCKS
   - Swap Fee: 1%
   - Paused: false

3️⃣ Environment variables to add:
VITE_SECONDARY_MARKET_ADDRESS=0x...

🎉 SecondaryMarket deployment completed successfully!
```

### 3. Update Frontend Configuration

Add the deployed contract address to your `.env` file:

```bash
VITE_SECONDARY_MARKET_ADDRESS=0x... # Address from deployment output
```

### 4. Verify Contract on BSCScan

```bash
npx hardhat verify --network bscmainnet 0x... \
  "0x55d398326f99059ff775485246999027b3197955" \
  "0x292E1B8CBE91623E71D6532e6BE6B881Cc0a9c31" \
  "0x10ed43c718714eb63d5aa57b78b54704e256024e" \
  "0xca143ce32fe78f1f7019d7d551a6402fc5350c73" \
  "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4" \
  "0x..." \
  "2000000000000000000"
```

### 5. Test Trading Functionality

1. **Restart your frontend application**
2. **Connect wallet to BSC Mainnet**
3. **Navigate to the Trading page**
4. **Verify balances and market information are loading**
5. **Test a small swap transaction**

## Contract Configuration

### Initial Settings
- **Target Price**: 2.0 USDT per BLOCKS token
- **Trading Fee**: 1% (100 basis points)
- **Admin**: Deployer address
- **Fee Recipient**: Treasury address
- **Status**: Active (not paused)

### Admin Functions Available
- `updateTargetPrice()` - Update BLOCKS token price
- `updateSwapFee()` - Update trading fee (max 10%)
- `updateFeeRecipient()` - Change fee recipient
- `pause()/unpause()` - Emergency pause trading

## Trading Flow

### USDT → BLOCKS
1. User approves USDT spending
2. Contract calculates fee (1%)
3. Remaining USDT swapped via PancakeSwap
4. BLOCKS tokens sent to user
5. Fee sent to treasury

### BLOCKS → USDT
1. User approves BLOCKS spending
2. BLOCKS swapped via PancakeSwap
3. Fee calculated on received USDT
4. Fee sent to treasury
5. Remaining USDT sent to user

## Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **AccessControl**: Admin-only functions protected
- **Pausable**: Emergency pause capability
- **Slippage Protection**: Minimum output amounts
- **Fee Limits**: Maximum 10% trading fee

## Troubleshooting

### Common Issues

1. **"Secondary market trading is not available"**
   - Check `VITE_SECONDARY_MARKET_ADDRESS` is set
   - Verify contract is deployed and verified
   - Restart frontend application

2. **"Insufficient allowance"**
   - User needs to approve token spending
   - Check token approval amounts

3. **"Swap failed"**
   - Verify sufficient token balances
   - Check slippage tolerance settings
   - Ensure PancakeSwap liquidity exists

### Support
If you encounter issues:
1. Check BSCScan for transaction details
2. Verify contract state on BSCScan
3. Check frontend console for error messages
4. Ensure all environment variables are set correctly

## Next Steps After Deployment

1. **Monitor trading activity**
2. **Adjust target price as needed**
3. **Configure optimal trading fees**
4. **Set up monitoring and alerts**
5. **Consider market making strategies**

---

**Deployment completed successfully! 🎉**

Your BlockCoop Sacco platform now has a fully functional secondary market for BLOCKS token trading.


