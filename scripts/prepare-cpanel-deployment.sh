#!/bin/bash

# BlockCoop Frontend - cPanel Deployment Preparation Script
# This script prepares the frontend build for cPanel upload

set -e

# Configuration
PROJECT_NAME="blockcoop-frontend"
BUILD_DIR="dist"
DEPLOYMENT_DIR="cpanel-deployment"
ZIP_NAME="${PROJECT_NAME}-cpanel-$(date +%Y%m%d-%H%M%S).zip"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                BlockCoop Frontend cPanel Deployment         ║"
    echo "║                        Preparation Script                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo "Timestamp: $TIMESTAMP"
    echo "Project: $PROJECT_NAME"
    echo ""
}

# Check if running from project root
if [ ! -f "package.json" ] || [ ! -f "vite.config.ts" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

print_header

# Step 1: Clean previous builds
print_step "Cleaning previous builds..."
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
    print_success "Previous build directory cleaned"
fi

if [ -d "$DEPLOYMENT_DIR" ]; then
    rm -rf "$DEPLOYMENT_DIR"
    print_success "Previous deployment directory cleaned"
fi

# Step 2: Install dependencies
print_step "Installing dependencies..."
npm ci
print_success "Dependencies installed"

# Step 3: Build the project
print_step "Building project for production..."
npm run build
print_success "Production build completed"

# Step 4: Verify build output
print_step "Verifying build output..."
if [ ! -d "$BUILD_DIR" ]; then
    print_error "Build directory not found. Build may have failed."
    exit 1
fi

if [ ! -f "$BUILD_DIR/index.html" ]; then
    print_error "index.html not found in build directory. Build may have failed."
    exit 1
fi

print_success "Build verification passed"

# Step 5: Create deployment directory structure
print_step "Creating deployment directory structure..."
mkdir -p "$DEPLOYMENT_DIR"
cp -r "$BUILD_DIR"/* "$DEPLOYMENT_DIR/"
print_success "Deployment directory created"

# Step 6: Create deployment instructions
print_step "Creating deployment instructions..."
cat > "$DEPLOYMENT_DIR/DEPLOYMENT_INSTRUCTIONS.md" << 'EOF'
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
EOF

print_success "Deployment instructions created"

# Step 7: Create .htaccess for SPA routing
print_step "Creating .htaccess for SPA routing..."
cat > "$DEPLOYMENT_DIR/.htaccess" << 'EOF'
# BlockCoop Frontend - SPA Routing Configuration

# Enable rewrite engine
RewriteEngine On

# Handle Angular/React Router
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"

# Cache static assets
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, immutable"
</FilesMatch>

# Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
EOF

print_success ".htaccess file created for SPA routing"

# Step 8: Create environment template
print_step "Creating environment template..."
cat > "$DEPLOYMENT_DIR/env.template" << 'EOF'
# BlockCoop Frontend Environment Configuration Template
# Copy this file to .env and fill in your actual values

# Blockchain Configuration
VITE_BSC_RPC_URL=https://bsc-dataseed1.binance.org/
VITE_CHAIN_ID=56
VITE_NETWORK_NAME=BSC Mainnet

# Contract Addresses (Replace with your actual deployed contract addresses)
VITE_PACKAGE_MANAGER_ADDRESS=0x0000000000000000000000000000000000000000
VITE_SHARE_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
VITE_LP_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
VITE_VESTING_VAULT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_USDT_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
VITE_ROUTER_ADDRESS=0x0000000000000000000000000000000000000000
VITE_FACTORY_ADDRESS=0x0000000000000000000000000000000000000000
VITE_TAX_MANAGER_ADDRESS=0x0000000000000000000000000000000000000000

# WalletConnect Configuration
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id_here

# USDT Configuration
VITE_USDT_DECIMALS=18
VITE_EXCHANGE_RATE_DECIMALS=18

# Optional: Secondary Market (if deployed)
VITE_SECONDARY_MARKET_ADDRESS=0x0000000000000000000000000000000000000000

# Optional: Staking (if deployed)
VITE_STAKING_ADDRESS=0x0000000000000000000000000000000000000000

# Optional: Dividend Distributor (if deployed)
VITE_DIVIDEND_DISTRIBUTOR_ADDRESS=0x0000000000000000000000000000000000000000
EOF

print_success "Environment template created"

# Step 9: Create deployment package
print_step "Creating deployment package..."
cd "$DEPLOYMENT_DIR"
zip -r "../$ZIP_NAME" . -x "*.DS_Store" "*/.*" "*/node_modules/*"
cd ..
print_success "Deployment package created: $ZIP_NAME"

# Step 10: Generate deployment summary
print_step "Generating deployment summary..."
cat > "DEPLOYMENT_SUMMARY.md" << EOF
# BlockCoop Frontend Deployment Summary

## 📊 Build Information
- **Build Date**: $TIMESTAMP
- **Build Directory**: $BUILD_DIR
- **Deployment Package**: $ZIP_NAME
- **Package Size**: $(du -h "$ZIP_NAME" | cut -f1)

## 📁 Files Included
- Production-ready React application
- Optimized and minified assets
- SPA routing configuration (.htaccess)
- Environment configuration template
- Deployment instructions

## 🚀 Next Steps
1. Upload \`$ZIP_NAME\` to your cPanel
2. Extract the package in your \`public_html\` directory
3. Configure environment variables
4. Test the application

## 📋 Checklist
- [ ] Build completed successfully
- [ ] All assets optimized
- [ ] SPA routing configured
- [ ] Environment template created
- [ ] Deployment package generated
- [ ] Instructions documented

## 🔧 Technical Details
- **Framework**: React + Vite
- **Build Tool**: Vite
- **Package Manager**: npm
- **Node Version**: $(node --version)
- **npm Version**: $(npm --version)

---
Generated by prepare-cpanel-deployment.sh on $TIMESTAMP
EOF

print_success "Deployment summary generated"

# Final output
echo ""
echo -e "${GREEN}🎉 cPanel Deployment Preparation Complete!${NC}"
echo ""
echo "📦 Deployment Package: $ZIP_NAME"
echo "📁 Build Directory: $BUILD_DIR"
echo "📋 Instructions: $DEPLOYMENT_DIR/DEPLOYMENT_INSTRUCTIONS.md"
echo "📝 Summary: DEPLOYMENT_SUMMARY.md"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Upload $ZIP_NAME to your cPanel"
echo "2. Extract in your public_html directory"
echo "3. Configure environment variables"
echo "4. Test the application"
echo ""
echo -e "${BLUE}Happy Deploying! 🚀${NC}"
