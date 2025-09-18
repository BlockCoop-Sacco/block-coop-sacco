# BlockCoop Gasless Transactions Implementation

This document provides a comprehensive guide to the gasless transaction system implemented for BlockCoop Sacco, allowing users to interact with smart contracts without paying gas fees.

## 🚀 Overview

The gasless transaction system uses OpenZeppelin's MinimalForwarder contract to relay user-signed transactions through a backend relayer. Users sign messages with their private keys, and the relayer executes the transactions on-chain while paying for gas fees.

## 🏗️ Architecture

```
User (Frontend) → Signs Message → Backend Relayer → Blockchain
     ↓              ↓              ↓
  MetaMask    EIP-712 Sig    Pays Gas Fee
```

### Components

1. **MinimalForwarder**: OpenZeppelin contract that verifies and executes relayed transactions
2. **GaslessPackageManager**: Modified PackageManager contract compatible with gasless transactions
3. **Backend Relayer**: Node.js service that relays signed transactions
4. **Frontend Service**: JavaScript service for creating and sending gasless requests
5. **Database**: SQLite database for tracking relayed transactions

## 📋 Prerequisites

- Node.js 18+
- Hardhat development environment
- BSC Mainnet/Testnet access
- MetaMask or compatible wallet
- Backend VPS with BNB for gas fees

## 🚀 Deployment Steps

### 1. Deploy Smart Contracts

```bash
# Deploy to BSC Testnet first
npx hardhat run scripts/deploy-gasless.js --network bsctestnet

# Deploy to BSC Mainnet
npx hardhat run scripts/deploy-gasless.js --network bscmainnet
```

### 2. Update Environment Variables

Create `.env` file with deployed contract addresses:

```bash
# Contract Addresses
FORWARDER_ADDRESS=0x... # Deployed MinimalForwarder address
GASLESS_PACKAGE_MANAGER_ADDRESS=0x... # Deployed GaslessPackageManager address

# Relayer Configuration
RELAYER_PRIVATE_KEY=your_relayer_private_key
RELAYER_WALLET_ADDRESS=your_relayer_wallet_address

# Network Configuration
BSC_MAINNET_RPC=https://bsc-dataseed1.binance.org/
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
```

### 3. Fund Relayer Wallet

Ensure the relayer wallet has sufficient BNB for gas fees:

```bash
# Check balance
npx hardhat console --network bscmainnet
> const balance = await ethers.provider.getBalance("RELAYER_ADDRESS")
> ethers.utils.formatEther(balance)
```

## 🧪 Testing

### Run Test Suite

```bash
# Test on local network
npx hardhat test

# Test gasless functionality specifically
npx hardhat run scripts/test-gasless.js --network localhost
```

### Test Scenarios

1. **Forwarder Functionality**: Basic transaction relay
2. **Gasless Purchase**: Package purchase without gas fees
3. **Nonce Management**: Prevents replay attacks
4. **Signature Verification**: EIP-712 compliance
5. **Deadline Validation**: Transaction expiration handling

## 🔧 Backend Setup

### 1. Install Dependencies

```bash
cd backend
# ethers v6 is already included in package.json
npm install
```

### 2. Initialize Database

```bash
npm run dev
# Database tables will be created automatically
```

### 3. Start Relayer Service

The relayer service starts automatically with the backend. Check status:

```bash
curl http://localhost:3001/api/gasless/status
```

### 4. Monitor Logs

```bash
tail -f logs/app.log
```

## 🎨 Frontend Integration

### 1. Environment Configuration

Create `src/.env` file:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_FORWARDER_ADDRESS=0x...
VITE_GASLESS_PACKAGE_MANAGER_ADDRESS=0x...
```

### 2. Initialize Service

```javascript
import gaslessService from './services/gaslessService.js';

// Initialize with wallet connection
await gaslessService.initialize();

// Check connection
if (gaslessService.isWalletConnected()) {
  console.log('Wallet connected:', await gaslessService.getWalletAddress());
}
```

### 3. Create Gasless Purchase

```javascript
try {
  const result = await gaslessService.purchasePackage(
    packageId,
    usdtAmount,
    referrerAddress
  );
  console.log('Purchase successful:', result.transactionHash);
} catch (error) {
  console.error('Purchase failed:', error);
}
```

## 📊 API Endpoints

### Gasless Transaction Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/gasless/relay` | Relay generic gasless transaction |
| POST | `/api/gasless/purchase` | Relay package purchase |
| GET | `/api/gasless/status` | Get relayer status |
| GET | `/api/gasless/transactions/:address` | Get user transactions |
| GET | `/api/gasless/transaction/:hash` | Get transaction details |
| POST | `/api/gasless/retry/:id` | Retry failed transaction |
| GET | `/api/gasless/stats` | Get transaction statistics |

### Request Examples

#### Package Purchase

```json
{
  "userWalletAddress": "0x...",
  "packageId": 1,
  "usdtAmount": "1000000000000000000000",
  "referrer": "0x...",
  "deadline": 1672531200,
  "signature": "0x..."
}
```

#### Generic Transaction

```json
{
  "from": "0x...",
  "to": "0x...",
  "value": 0,
  "gas": 500000,
  "nonce": 0,
  "data": "0x...",
  "validUntil": 0,
  "signature": "0x..."
}
```

## 🔒 Security Features

### 1. Signature Verification

- EIP-712 compliant message signing
- Nonce-based replay protection
- Deadline validation
- Address verification

### 2. Rate Limiting

- API rate limiting on payment endpoints
- Transaction frequency controls
- IP-based restrictions

### 3. Gas Optimization

- Configurable gas limits
- Gas price controls
- Failed transaction retry mechanisms

## 📈 Monitoring & Analytics

### Transaction Tracking

All relayed transactions are logged in the database with:

- User wallet address
- Transaction hash
- Gas used
- Status (pending/success/failed/expired)
- Error messages
- Relayer information

### Statistics API

```bash
curl http://localhost:3001/api/gasless/stats
```

Returns:
- Total transactions
- Success/failure rates
- Pending transactions
- Expired transactions

## 🚨 Troubleshooting

### Common Issues

1. **Insufficient Gas**: Ensure relayer wallet has BNB
2. **Invalid Signature**: Check EIP-712 message format
3. **Expired Transaction**: Verify deadline timestamps
4. **Network Issues**: Check BSC RPC endpoint connectivity

### Debug Commands

```bash
# Check relayer status
curl http://localhost:3001/api/gasless/status

# View recent transactions
curl http://localhost:3001/api/gasless/transactions/0x...

# Check database logs
tail -f logs/app.log
```

### Log Analysis

```bash
# Filter gasless transaction logs
grep "gasless" logs/app.log

# Check for errors
grep "ERROR" logs/app.log | grep "gasless"
```

## 🔄 Maintenance

### Regular Tasks

1. **Monitor Relayer Balance**: Ensure sufficient BNB for gas
2. **Review Failed Transactions**: Analyze and retry where appropriate
3. **Update Gas Prices**: Adjust based on network conditions
4. **Database Cleanup**: Archive old transaction records

### Performance Optimization

1. **Gas Price Monitoring**: Use dynamic gas pricing
2. **Batch Processing**: Group multiple transactions
3. **Connection Pooling**: Optimize database connections
4. **Caching**: Implement response caching for status queries

## 📚 Additional Resources

- [OpenZeppelin MinimalForwarder Documentation](https://docs.openzeppelin.com/contracts/4.x/api/metatx)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [BSC Documentation](https://docs.binance.org/)
- [MetaMask Signing Guide](https://docs.metamask.io/guide/signing-data.html)

## 🤝 Support

For technical support or questions about the gasless transaction system:

1. Check the troubleshooting section above
2. Review application logs
3. Verify environment configuration
4. Test with the provided test scripts

## 📝 Changelog

### Version 1.0.0
- Initial implementation of gasless transaction system
- MinimalForwarder contract deployment
- GaslessPackageManager integration
- Backend relayer service
- Frontend service integration
- Comprehensive testing suite
- API documentation and examples
