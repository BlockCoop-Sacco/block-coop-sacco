# BlockCoop Frontend - cPanel Deployment Instructions

## 📦 What's Included
This package contains the production-ready React application for BlockCoop Sacco.

## 🚀 Quick Deployment Steps

### 1. Upload to cPanel
- Log into your cPanel account
- Navigate to File Manager
- Go to your domain's `public_html` directory (or subdomain directory)
- Upload all files from this package to the root directory

### 2. Verify Deployment
- Check that your website loads without errors
- Verify that all assets (CSS, JS, images) are loading correctly
- Test wallet connection functionality

## ⚙️ Environment Configuration

### Required Environment Variables
Make sure to set these in your cPanel environment variables or .env file:

```env
# Blockchain Configuration
VITE_BSC_RPC_URL=https://bsc-dataseed1.binance.org/
VITE_CHAIN_ID=56
VITE_NETWORK_NAME=BSC Mainnet

# Contract Addresses
VITE_PACKAGE_MANAGER_ADDRESS=0x...
VITE_SHARE_TOKEN_ADDRESS=0x...
VITE_LP_TOKEN_ADDRESS=0x...
VITE_VESTING_VAULT_ADDRESS=0x...
VITE_USDT_TOKEN_ADDRESS=0x...
VITE_ROUTER_ADDRESS=0x...
VITE_FACTORY_ADDRESS=0x...
VITE_TAX_MANAGER_ADDRESS=0x...

# WalletConnect Configuration
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id_here

# USDT Configuration
VITE_USDT_DECIMALS=18
VITE_EXCHANGE_RATE_DECIMALS=18
```

## 🔧 Troubleshooting

### Common Issues:
1. **404 Errors**: Ensure all files are in the correct directory
2. **Environment Variables**: Check that all required env vars are set
3. **CORS Issues**: Configure proper CORS headers if needed
4. **Asset Loading**: Verify all asset files are accessible

### Performance Optimization:
- Enable browser caching in cPanel
- Consider using a CDN for static assets
- Enable gzip compression

## 📱 Features Included

✅ **Package Management**
- Package purchasing with M-Pesa integration
- Admin package management (pause/activate packages)
- Dual pricing system (exchange rates + global target price)

✅ **Core Functionality**
- Wallet connection (MetaMask, WalletConnect)
- Portfolio management
- Referral system
- Staking interface
- Trading functionality
- Liquidity management

## 🆘 Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify all environment variables are set correctly
3. Ensure contract addresses are valid and deployed
4. Check network connectivity to BSC

---

**Build Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Version**: Production Build
**Framework**: React + Vite
**Blockchain**: BSC (Binance Smart Chain)
