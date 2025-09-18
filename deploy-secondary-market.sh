#!/bin/bash

# SecondaryMarket Contract Deployment Script
# This script deploys the SecondaryMarket contract to BSC Mainnet

set -e  # Exit on any error

echo "🚀 BlockCoop Sacco - SecondaryMarket Deployment"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "hardhat.config.cjs" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create one with your configuration."
    echo "Required variables:"
    echo "  - BSC_MAINNET_RPC"
    echo "  - PRIVATE_KEY"
    echo "  - ETHERSCAN_API_KEY"
    exit 1
fi

# Check if deployments directory exists
if [ ! -d "deployments" ]; then
    echo "❌ Error: deployments directory not found. Please deploy core contracts first."
    exit 1
fi

# Check if mainnet deployment exists
if [ ! -f "deployments/deployments-mainnet-v2_2.json" ]; then
    echo "❌ Error: Mainnet deployment file not found."
    echo "Please deploy core contracts first using:"
    echo "  npx hardhat run scripts/deploy-v2_2-mainnet.cjs --network bscmainnet"
    exit 1
fi

echo "✅ Environment checks passed"
echo ""

# Load environment variables
source .env

# Check required environment variables
if [ -z "$BSC_MAINNET_RPC" ] || [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: Missing required environment variables"
    echo "Please ensure BSC_MAINNET_RPC and PRIVATE_KEY are set in your .env file"
    exit 1
fi

echo "🔧 Configuration:"
echo "  - Network: BSC Mainnet"
echo "  - RPC: ${BSC_MAINNET_RPC:0:30}..."
echo "  - Deployer: ${PRIVATE_KEY:0:10}..."
echo ""

# Confirm deployment
read -p "🤔 Are you ready to deploy SecondaryMarket to BSC Mainnet? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "🚀 Starting deployment..."

# Deploy the contract
echo "📦 Deploying SecondaryMarket contract..."
npx hardhat run scripts/deploy-secondary-market.cjs --network bscmainnet

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy the VITE_SECONDARY_MARKET_ADDRESS from the output above"
    echo "2. Add it to your .env file"
    echo "3. Restart your frontend application"
    echo "4. Test the trading functionality"
    echo ""
    echo "🔍 You can verify the contract on BSCScan using the address above"
    echo ""
    echo "Happy trading! 🚀"
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    echo "Common issues:"
    echo "  - Insufficient BNB for gas fees"
    echo "  - Network connectivity issues"
    echo "  - Contract compilation errors"
    exit 1
fi


