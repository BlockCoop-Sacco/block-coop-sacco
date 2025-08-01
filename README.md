# BlockCoop Sacco - Decentralized Cooperative Finance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org/)
[![BSC Testnet](https://img.shields.io/badge/BSC-Testnet-yellow)](https://testnet.bscscan.com/)

## 🌟 Overview

BlockCoop Sacco is a revolutionary decentralized finance (DeFi) platform that bridges traditional cooperative finance with blockchain technology. Built on Binance Smart Chain (BSC), it enables users to participate in cooperative savings, investment packages, and earn rewards through a comprehensive ecosystem of smart contracts.

### 🎯 Mission
To democratize access to financial services by combining the trust and community aspects of traditional savings and credit cooperatives (SACCOs) with the transparency, efficiency, and global accessibility of blockchain technology.

## ✨ Key Features

### 📦 Investment Packages
- **Flexible Investment Options**: Multiple package tiers with varying entry amounts and returns
- **Automated Token Distribution**: Smart contract-based allocation of BLOCKS tokens and LP tokens
- **Vesting Mechanism**: Time-locked rewards to ensure long-term commitment
- **Referral System**: Earn rewards by referring new members to the platform

### 🏦 DeFi Ecosystem
- **BLOCKS Token**: Native utility token with integrated DEX trading taxes
- **Liquidity Provision**: Automated liquidity pool management with PancakeSwap integration
- **Staking Rewards**: Multiple staking pools with different lock periods and APY rates
- **Dividend Distribution**: Automated profit sharing among token holders

### 💰 Payment Integration
- **M-Pesa Integration**: Seamless mobile money payments for African users
- **USDT Support**: Stable cryptocurrency payments for global accessibility
- **Multi-Currency Support**: Flexible payment options for diverse user base

### 🔒 Security & Governance
- **Role-Based Access Control**: Secure administrative functions
- **Pausable Contracts**: Emergency stop mechanisms for enhanced security
- **Transparent Operations**: All transactions recorded on-chain for full transparency

## 🏗️ Architecture

### Smart Contracts
- **PackageManager**: Core investment package management and token distribution
- **VestingVault**: Time-locked token vesting with cliff periods
- **BLOCKS Token**: ERC20 token with integrated DEX taxes and minting capabilities
- **StakingV2**: Multi-pool staking system with flexible reward mechanisms
- **DividendDistributor**: Automated profit distribution system
- **SecondaryMarket**: P2P trading platform for package transfers

### Frontend (React/TypeScript)
- **Modern UI/UX**: Responsive design with Tailwind CSS
- **Web3 Integration**: Seamless wallet connectivity with AppKit/WalletConnect
- **Real-time Data**: Live updates of balances, rewards, and market data
- **Mobile Responsive**: Optimized for mobile and desktop experiences

### Backend (Node.js/Express)
- **M-Pesa API Integration**: Secure payment processing
- **Database Management**: SQLite for transaction logging and user data
- **API Security**: Rate limiting, authentication, and input validation
- **Monitoring & Logging**: Comprehensive error tracking and performance monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn package manager
- Git for version control
- MetaMask or compatible Web3 wallet

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/BlockCoop-Sacco/block-coop-sacco.git
   cd block-coop-sacco
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure your environment variables
   nano .env
   ```

5. **Start Development Servers**
   ```bash
   # Start frontend (port 5173)
   npm run dev
   
   # Start backend (port 3001) - in separate terminal
   cd backend
   npm run dev
   ```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Network Configuration
VITE_CHAIN_ID=97
VITE_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# Contract Addresses (BSC Testnet)
VITE_PACKAGE_MANAGER_ADDRESS=0xF7075036dBd8d393B4DcF63071C3eF4abD8f31b9
VITE_SHARE_ADDRESS=0x1d1669EF234081330a78Da546F1aE744e85b551F
VITE_USDT_ADDRESS=0x52f8BE86c4157eF5F11f3d73135ec4a568B02b90
VITE_STAKING_ADDRESS=0x554a9631E00103cC97282D0BC27Ba0A9a4ab4A5E

# API Configuration
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

## 📱 Usage Guide

### For Investors
1. **Connect Wallet**: Use MetaMask or WalletConnect to connect your BSC wallet
2. **Choose Package**: Select an investment package that suits your budget
3. **Make Payment**: Pay using USDT or M-Pesa (for supported regions)
4. **Receive Tokens**: Get BLOCKS tokens and LP tokens automatically
5. **Stake & Earn**: Stake your tokens to earn additional rewards
6. **Track Portfolio**: Monitor your investments and rewards in real-time

### For Administrators
1. **Access Admin Panel**: Navigate to `/admin` with admin privileges
2. **Manage Packages**: Create, update, or deactivate investment packages
3. **Configure Taxes**: Set trading taxes and fee structures
4. **Monitor System**: Track platform metrics and user activity

## 🧪 Testing

### Frontend Tests
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Backend Tests
```bash
cd backend

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run all tests
npm run test
```

### Smart Contract Tests
```bash
# Run Hardhat tests
npx hardhat test

# Run with gas reporting
npx hardhat test --gas-report
```

## 🚀 Deployment

### Frontend Deployment (cPanel)
1. **Build for Production**
   ```bash
   npm run build
   ```

2. **Upload to cPanel**
   - Upload contents of `dist/` folder to your cPanel public_html directory
   - Ensure all files including assets are uploaded

### Backend Deployment
1. **Prepare Production Environment**
   ```bash
   cd backend
   npm run build
   ```

2. **Deploy to Server**
   - Configure production environment variables
   - Set up SSL certificates
   - Configure reverse proxy (if needed)

### Smart Contract Deployment
```bash
# Deploy to BSC Testnet
npx hardhat run scripts/deploy-fresh-blockcoop-v2.cjs --network bsctestnet

# Verify contracts
npx hardhat run scripts/verify-v2-contracts.cjs --network bsctestnet
```

## 📊 Network Information

### BSC Testnet
- **Chain ID**: 97
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Explorer**: https://testnet.bscscan.com/
- **Faucet**: https://testnet.binance.org/faucet-smart

### Contract Addresses (Testnet)
- **Package Manager**: `0xF7075036dBd8d393B4DcF63071C3eF4abD8f31b9`
- **BLOCKS Token**: `0x1d1669EF234081330a78Da546F1aE744e85b551F`
- **USDT Token**: `0x52f8BE86c4157eF5F11f3d73135ec4a568B02b90`
- **Staking Contract**: `0x554a9631E00103cC97282D0BC27Ba0A9a4ab4A5E`

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Ethers.js v6** - Ethereum library for Web3 interactions
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **SQLite** - Lightweight database
- **Winston** - Logging library
- **Helmet** - Security middleware
- **Express Rate Limit** - Rate limiting

### Blockchain
- **Solidity 0.8.20** - Smart contract language
- **Hardhat** - Development environment
- **OpenZeppelin** - Security-audited contract libraries
- **Binance Smart Chain** - Layer 1 blockchain

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- [API Documentation](docs/API_DOCUMENTATION.md)
- [Environment Setup](docs/ENVIRONMENT_SETUP.md)
- [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md)
- [Frontend Components](docs/FRONTEND_COMPONENTS.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING_GUIDE.md)

## 🤝 Contributing

We welcome contributions from the community! Please read our contributing guidelines:

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Changes**: `git commit -m 'Add amazing feature'`
4. **Push to Branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines
- Follow TypeScript/JavaScript best practices
- Write comprehensive tests for new features
- Update documentation for any API changes
- Ensure all tests pass before submitting PR

## 🔒 Security

Security is our top priority. If you discover a security vulnerability, please:

1. **Do NOT** create a public issue
2. Email security concerns to: security@blockcoopsacco.com
3. Provide detailed information about the vulnerability
4. Allow time for assessment and resolution

### Security Features
- **Role-Based Access Control**: Multi-level permission system
- **Pausable Contracts**: Emergency stop functionality
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Input Validation**: Comprehensive parameter validation
- **Rate Limiting**: API protection against abuse
- **Audit Trail**: Complete transaction logging

## 🚨 Troubleshooting

### Common Issues

#### Network Connection Problems
```bash
# Check if you're connected to BSC Testnet
# Chain ID should be 97
# RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/
```

#### Transaction Failures
- Ensure sufficient BNB for gas fees
- Check if contracts are not paused
- Verify token allowances are set correctly
- Confirm you're on the correct network (BSC Testnet)

#### Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
npm run dev
```

For more detailed troubleshooting, see [Troubleshooting Guide](docs/TROUBLESHOOTING_GUIDE.md).

## 📈 Roadmap

### Phase 1: Foundation (Q1 2024) ✅
- [x] Core smart contracts development
- [x] Frontend application with Web3 integration
- [x] M-Pesa payment integration
- [x] BSC Testnet deployment

### Phase 2: Enhancement (Q2 2024) 🚧
- [ ] Advanced staking mechanisms
- [ ] Governance token implementation
- [ ] Mobile application development
- [ ] Security audit completion

### Phase 3: Expansion (Q3 2024) 📋
- [ ] BSC Mainnet deployment
- [ ] Multi-chain support (Polygon, Ethereum)
- [ ] Additional payment gateways
- [ ] Partnership integrations

### Phase 4: Scale (Q4 2024) 📋
- [ ] DAO governance implementation
- [ ] Advanced DeFi features
- [ ] Institutional partnerships
- [ ] Global market expansion

## 🔧 API Reference

### Package Management API

#### Get Available Packages
```javascript
GET /api/packages
Response: {
  "packages": [
    {
      "id": 1,
      "name": "Starter Package",
      "entryUSDT": "100000000000000000000",
      "exchangeRate": "1000000000000000000",
      "vestBps": 3000,
      "active": true
    }
  ]
}
```

#### Purchase Package
```javascript
POST /api/packages/purchase
Body: {
  "packageId": 1,
  "paymentMethod": "usdt",
  "referrer": "0x..."
}
```

### M-Pesa Integration API

#### Initiate Payment
```javascript
POST /api/mpesa/initiate
Body: {
  "phoneNumber": "254700000000",
  "amount": 1000,
  "packageId": 1
}
```

For complete API documentation, see [API Documentation](docs/API_DOCUMENTATION.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌍 Community & Support

- **Website**: [https://blockcoopsacco.com](https://blockcoopsacco.com)
- **Documentation**: [https://docs.blockcoopsacco.com](https://docs.blockcoopsacco.com)
- **Telegram**: [https://t.me/blockcoopsacco](https://t.me/blockcoopsacco)
- **Twitter**: [@BlockCoopSacco](https://twitter.com/BlockCoopSacco)
- **Email**: support@blockcoopsacco.com

## 🙏 Acknowledgments

- **OpenZeppelin** for secure smart contract libraries
- **PancakeSwap** for DEX integration
- **Binance Smart Chain** for blockchain infrastructure
- **Safaricom** for M-Pesa API integration
- **Community Contributors** for ongoing support and feedback

---

**Built with ❤️ by the BlockCoop Sacco Team**

*Empowering communities through decentralized cooperative finance*
