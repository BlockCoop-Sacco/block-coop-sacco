# BlockCoop Frontend - cPanel Deployment Guide

## 📦 Deployment Package
- **File**: `blockcoop-frontend-deployment.zip`
- **Size**: ~1.3MB
- **Contents**: Production-ready React application

## 🚀 cPanel Deployment Steps

### 1. Access cPanel
- Log into your cPanel account
- Navigate to the File Manager

### 2. Upload the Package
- Go to your domain's public_html directory (or subdomain directory)
- Upload `blockcoop-frontend-deployment.zip` to the root directory

### 3. Extract the Package
- Right-click on the zip file
- Select "Extract" or "Extract Files"
- Extract to the current directory

### 4. Move Files to Root
- After extraction, you'll have a `dist` folder
- Move all contents from `dist/` to the root directory
- Delete the empty `dist` folder

### 5. Verify Deployment
- Your directory structure should look like:
  ```
  public_html/
  ├── index.html
  ├── manifest.json
  ├── favicon.ico
  ├── Blockcooplogo.png
  └── assets/
      ├── index-D2p_US1m.css
      ├── index-BmNz3749.js
      └── [other asset files]
  ```

## ⚙️ Environment Configuration

### Required Environment Variables
Make sure your `.env` file or cPanel environment variables include:

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
- The build includes gzip compression
- Assets are optimized and minified
- Consider enabling browser caching in cPanel

## 📱 Features Included

✅ **Fixed Package Card Display Issues**
- Correct exchange rate formatting (1.5 USDT/BLOCKS)
- Proper percentage calculations
- Accurate token distribution display
- Fixed array mapping bugs

✅ **Core Functionality**
- Package purchasing
- Wallet connection
- Portfolio management
- Referral system
- Staking interface
- Trading functionality

## 🆘 Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify all environment variables are set correctly
3. Ensure contract addresses are valid and deployed
4. Check network connectivity to BSC

## 📋 Post-Deployment Checklist

- [ ] Website loads without errors
- [ ] Wallet connection works
- [ ] Package cards display correctly
- [ ] All environment variables are configured
- [ ] Contract addresses are correct
- [ ] SSL certificate is active (recommended)

---

**Build Date**: August 25, 2024  
**Version**: Production Build  
**Framework**: React + Vite  
**Blockchain**: BSC (Binance Smart Chain)
