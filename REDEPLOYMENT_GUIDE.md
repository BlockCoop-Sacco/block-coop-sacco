# PackageManagerV2_2 Redeployment Guide

## Overview

This guide will help you redeploy the `PackageManagerV2_2` smart contract with the fixes we implemented:
1. **1:1 BLOCKS to BLOCKS-LP Token Ratio Fix**
2. **Referral System Tracking Fix**

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Hardhat configured for BSC Mainnet
- ✅ Environment variables set up
- ✅ Sufficient BNB for gas fees
- ✅ Deployer wallet with admin roles on existing contracts

## Environment Setup

Create or update your `.env` file:

```bash
# BSC Mainnet RPC
BSC_MAINNET_RPC=https://bsc-dataseed1.binance.org/

# Deployer private key (keep secure!)
PRIVATE_KEY=your_private_key_here

# BSCScan API key for verification
ETHERSCAN_API_KEY=your_bscscan_api_key_here

# Optional: Purchase tax in basis points (e.g., 500 = 5%)
PURCHASE_TAX_BPS=500
```

## Step-by-Step Redeployment

### 1. **Compile Contracts**

```bash
cd /root/block-coop-sacco
npx hardhat compile
```

### 2. **Run Redeployment Script**

```bash
npx hardhat run scripts/redeploy-package-manager-v2_2-fixed.cjs --network bscmainnet
```

**What this script does:**
- ✅ Loads existing deployment addresses
- ✅ Verifies deployer permissions
- ✅ Deploys NEW PackageManagerV2_2 with fixes
- ✅ Grants necessary roles and permissions
- ✅ Initializes router allowances
- ✅ Saves updated deployment information

### 3. **Verify Contract on BSCScan**

```bash
npx hardhat run scripts/verify-package-manager-fixed.cjs --network bscmainnet
```

**Alternative: Manual Verification**
1. Go to [BSCScan](https://bscscan.com/)
2. Enter your new contract address
3. Click "Verify & Publish"
4. Select "Solidity (Single file)"
5. Compiler: v0.8.20
6. License: MIT
7. Upload flattened contract source

## Deployment Output

After successful deployment, you'll see:

```
🎉 REDEPLOYMENT COMPLETED SUCCESSFULLY!
======================================
📋 Deployment Summary:
   Network: bscmainnet
   Deployer: 0x...
   NEW PackageManager: 0xNEW_ADDRESS
   OLD PackageManager: 0xOLD_ADDRESS
   BLOCKS Token: 0x...
   BLOCKS-LP Token: 0x...
   Vesting Vault: 0x...
   Treasury: 0x...

🔧 Fixes Applied:
   ✅ 1:1 BLOCKS to BLOCKS-LP token ratio enforced
   ✅ Referral system tracking corrected
   ✅ All existing functionality preserved
```

## Update Frontend Configuration

### 1. **Environment Variables**

Update your frontend `.env` file:

```env
# OLD
VITE_PACKAGE_MANAGER_ADDRESS=0xOLD_ADDRESS

# NEW
VITE_PACKAGE_MANAGER_ADDRESS=0xNEW_ADDRESS
```

### 2. **Rebuild Frontend**

```bash
npm run build
```

## Testing the Fixes

### 1. **Test 1:1 Token Ratio**

Create a test package and verify:
- Total Tokens Received = BLOCKS-LP Received
- Both values should be identical

### 2. **Test Referral System**

Test referral purchase and verify:
- **Referrer** gets referral rewards tracked
- **Buyer** shows 0 referral rewards
- Referral statistics are accurate

### 3. **Test Existing Functionality**

Verify all other features still work:
- Package purchases
- Vesting mechanisms
- Liquidity pool operations
- Redemption system

## Deployment Files

The redeployment creates:
- `deployments/deployments-mainnet-v2_2-fixed-TIMESTAMP.json`
- Preserves old deployment information
- Includes fix details and verification status

## Troubleshooting

### **Permission Errors**
```bash
❌ Deployer does not have admin role on BLOCKS token
```
**Solution**: Ensure deployer wallet has admin role on existing contracts

### **Verification Failures**
```bash
❌ Verification failed
```
**Solution**: Use manual verification or check constructor arguments

### **Gas Issues**
```bash
❌ Out of gas
```
**Solution**: Increase gas limit in hardhat config or use higher gas price

## Post-Deployment Checklist

- [ ] Contract deployed successfully
- [ ] Contract verified on BSCScan
- [ ] Frontend environment variables updated
- [ ] Frontend rebuilt and deployed
- [ ] 1:1 ratio tested and working
- [ ] Referral system tested and working
- [ ] All existing functionality verified
- [ ] Documentation updated
- [ ] Team notified of changes

## Rollback Plan

If issues arise, you can:
1. **Revert frontend** to use old contract address
2. **Use old contract** while debugging
3. **Redeploy** with additional fixes

## Security Notes

- ✅ **Never share private keys**
- ✅ **Test on testnet first** (if possible)
- ✅ **Verify contract source code** on BSCScan
- ✅ **Monitor contract interactions** after deployment
- ✅ **Keep deployment files secure**

## Support

If you encounter issues:
1. Check deployment logs for errors
2. Verify environment variables
3. Ensure sufficient BNB balance
4. Check BSC network status
5. Review contract permissions

## Conclusion

This redeployment will fix the core tokenomics issues and ensure your platform works as intended. The 1:1 ratio and proper referral tracking will provide users with a consistent and fair experience.

**Remember**: Always test thoroughly before going live on mainnet!
