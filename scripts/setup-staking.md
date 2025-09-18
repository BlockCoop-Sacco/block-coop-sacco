# BlockCoop Sacco Staking Setup Guide

## Overview
This guide will help you deploy and activate the staking functionality for the BlockCoop Sacco project.

## Prerequisites
- Hardhat environment configured
- BSC Mainnet deployment access
- Sufficient BNB for gas fees
- USDT tokens for staking rewards

## Step 1: Deploy the Staking Contract

Run the deployment script:
```bash
npx hardhat run scripts/deploy-staking-v2.cjs --network bscmainnet
```

This will:
- Deploy the BLOCKSStakingV2 contract
- Create 4 staking pools:
  - **Flexible Staking**: 0 lock period, 8% APY
  - **30-Day Lock**: 30 days lock, 12% APY  
  - **90-Day Lock**: 90 days lock, 18% APY
  - **1-Year Lock**: 365 days lock, 25% APY
- Grant admin roles to the deployer
- Update the deployment configuration

## Step 2: Update Environment Variables

After deployment, you'll need to update your environment variables:

1. **Set the staking contract address**:
   ```bash
   VITE_STAKING_ADDRESS=<deployed_contract_address>
   ```

2. **Enable staking**:
   ```bash
   VITE_STAKING_ENABLED=true
   ```

## Step 3: Fund the Staking Contract

The staking contract needs USDT tokens to pay rewards. You can fund it by:

1. **Transfer USDT directly** to the staking contract address
2. **Use the admin functions** to set up reward distribution

## Step 4: Verify Deployment

Check that everything is working:

1. **Verify the contract** on BSCScan
2. **Test the frontend** - the staking page should now show the pools
3. **Test staking** with a small amount

## Step 5: Admin Configuration

As an admin, you can:

- **Adjust APY rates** for each pool
- **Modify lock periods** and minimum stakes
- **Pause/unpause** pools
- **Manage reward distribution**

## Troubleshooting

### "Staking contract not found" Error
- Ensure `VITE_STAKING_ADDRESS` is set correctly
- Verify the contract was deployed successfully
- Check that the address is valid

### "Staking is disabled" Error  
- Set `VITE_STAKING_ENABLED=true` in your environment
- Restart your development server

### "Failed to fetch staking pools" Error
- Check that the contract is deployed and verified
- Ensure you're connected to the correct network
- Verify the contract has the expected functions

## Contract Functions

### User Functions
- `stake(poolId, amount)` - Stake BLOCKS tokens
- `unstake(poolId, amount)` - Unstake tokens (if lock period expired)
- `claimRewards(poolId)` - Claim pending rewards
- `emergencyExit(poolId)` - Emergency exit with penalty

### Admin Functions
- `createPool(...)` - Create new staking pool
- `updatePool(...)` - Update pool parameters
- `setGlobalRewardRate(...)` - Set global reward rate
- `pausePool(poolId)` - Pause a pool
- `unpausePool(poolId)` - Unpause a pool

## Security Considerations

- **Multi-signature wallet** recommended for admin functions
- **Regular monitoring** of reward distribution
- **Emergency pause** capability for security incidents
- **Audit** the staking contract before mainnet deployment

## Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure the contract is properly deployed and funded
4. Contact the development team for assistance

