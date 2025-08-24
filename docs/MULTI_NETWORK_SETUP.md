# Multi-Network Configuration Guide

BlockCoop Sacco now supports both BSC Testnet (Chain ID 97) and BSC Mainnet (Chain ID 56). This guide explains how to configure and switch between networks.

## Supported Networks

### BSC Testnet (Chain ID: 97)
- **Purpose**: Development and testing
- **Currency**: tBNB (Test BNB)
- **Explorer**: https://testnet.bscscan.com
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **USDT Contract**: Test USDT token (18 decimals)

### BSC Mainnet (Chain ID: 56)
- **Purpose**: Production deployment
- **Currency**: BNB
- **Explorer**: https://bscscan.com
- **RPC URL**: https://bsc-dataseed1.binance.org/
- **USDT Contract**: 0x55d398326f99059fF775485246999027B3197955 (Real USDT)

## Configuration

### Environment Variables

The network is controlled by the `VITE_CHAIN_ID` environment variable:

```bash
# For BSC Testnet
VITE_CHAIN_ID=97

# For BSC Mainnet
VITE_CHAIN_ID=56
```

### Quick Setup

#### For BSC Testnet (Development)
```bash
cp .env.example .env
# Edit .env and ensure VITE_CHAIN_ID=97
```

#### For BSC Mainnet (Production)
```bash
cp .env.mainnet.example .env
# Edit .env with your mainnet contract addresses
# Ensure VITE_CHAIN_ID=56
```

## Contract Deployment

### Testnet Deployment
```bash
# Deploy to BSC Testnet
npx hardhat run scripts/deploy-blockcoop-v2-modular.cjs --network bsctestnet
```

### Mainnet Deployment
```bash
# Deploy to BSC Mainnet (ensure you have real BNB for gas)
npx hardhat run scripts/deploy-blockcoop-v2-modular.cjs --network bscmainnet
```

## Wallet Configuration

The application automatically detects the configured network and prompts users to switch if they're on the wrong network.

### Supported Wallets
- MetaMask
- WalletConnect compatible wallets
- Trust Wallet
- Binance Chain Wallet

### Network Switching
Users can switch networks through:
1. **Automatic prompts** when on wrong network
2. **Wallet interface** (manual switching)
3. **Network indicator** in the application header

## Development Workflow

### 1. Local Development (Testnet)
```bash
# Use testnet configuration
VITE_CHAIN_ID=97
npm run dev
```

### 2. Staging (Testnet)
```bash
# Deploy to staging with testnet
npm run build
# Deploy to staging server
```

### 3. Production (Mainnet)
```bash
# Switch to mainnet configuration
VITE_CHAIN_ID=56
# Update contract addresses in .env
npm run build
# Deploy to production server
```

## Security Considerations

### Testnet
- Use test tokens only
- Private keys can be shared for testing
- No real value at risk

### Mainnet
- **NEVER** share private keys
- Use hardware wallets for large amounts
- Test all functionality on testnet first
- Monitor gas prices
- Implement proper access controls

## Troubleshooting

### Wrong Network Error
If users see "Wrong Network" errors:
1. Check `VITE_CHAIN_ID` in environment
2. Verify wallet is connected to correct network
3. Use network switching functionality

### Contract Not Found
If contracts are not found:
1. Verify contract addresses in `.env`
2. Ensure contracts are deployed to the correct network
3. Check network configuration matches deployment

### RPC Issues
If RPC connection fails:
1. Try alternative RPC URLs
2. Check network connectivity
3. Verify RPC URL format

## Environment Files Reference

- `.env.example` - BSC Testnet template
- `.env.mainnet.example` - BSC Mainnet template
- `.env` - Your actual configuration (not in git)

## Network Indicator

The application includes a network indicator that shows:
- Current network (BSC Testnet/Mainnet)
- Connection status
- Wrong network warnings

## Best Practices

1. **Always test on testnet first**
2. **Use environment-specific configurations**
3. **Monitor gas prices on mainnet**
4. **Keep private keys secure**
5. **Verify contract addresses before deployment**
6. **Use proper error handling for network switches**

## Support

For network-related issues:
1. Check this documentation
2. Verify environment configuration
3. Test on testnet first
4. Contact development team if issues persist
