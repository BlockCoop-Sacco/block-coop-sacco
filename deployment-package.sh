#!/bin/bash

# BlockCoop M-Pesa Backend Deployment Script for Contabo
# Run this script on your Contabo server

set -e

echo "🚀 Starting BlockCoop M-Pesa Backend Deployment..."

# Configuration
APP_DIR="/var/www/api.blockcoopsacco.com"
BACKEND_DIR="$APP_DIR/backend"
SERVICE_NAME="mpesa-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Create directory structure
print_status "Creating directory structure..."
sudo mkdir -p $APP_DIR/{backend,logs,data,backups,scripts}
sudo chown -R $USER:www-data $APP_DIR
sudo chmod -R 755 $APP_DIR

# Create backend package.json
print_status "Creating backend package.json..."
cat > $BACKEND_DIR/package.json << 'EOF'
{
  "name": "blockcoop-mpesa-backend",
  "version": "1.0.0",
  "description": "BlockCoop M-Pesa Payment Integration Backend",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "axios": "^1.6.2",
    "sqlite3": "^5.1.6",
    "sequelize": "^6.35.2",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0",
    "ethers": "^6.8.1",
    "node-cron": "^3.0.3",
    "uuid": "^9.0.1",
    "joi": "^17.11.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": ["mpesa", "blockchain", "defi", "payment", "api"],
  "author": "BlockCoop Sacco",
  "license": "MIT"
}
EOF

# Create directory structure for backend
mkdir -p $BACKEND_DIR/src/{routes,services,models,middleware,database,utils}

print_status "Backend structure created successfully!"
print_warning "Next steps:"
echo "1. Copy your backend source code to $BACKEND_DIR/src/"
echo "2. Run: cd $BACKEND_DIR && npm install"
echo "3. Configure environment variables"
echo "4. Setup Nginx and SSL"
echo "5. Start the service"

echo ""
echo "📁 Directory structure created:"
echo "   $APP_DIR/"
echo "   ├── backend/"
echo "   │   ├── src/"
echo "   │   └── package.json"
echo "   ├── logs/"
echo "   ├── data/"
echo "   ├── backups/"
echo "   └── scripts/"
