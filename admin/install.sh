#!/bin/bash

# BlockCoop Admin Dashboard Installation Script
# Run this script to install and set up the admin dashboard

set -e

echo "🚀 Installing BlockCoop Admin Dashboard..."

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

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.8"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Python 3.8 or higher is required. Current version: $PYTHON_VERSION"
    exit 1
fi

print_status "Python version check passed: $PYTHON_VERSION"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    print_error "pip3 is not installed. Please install pip3."
    exit 1
fi

print_status "pip3 found"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip

# Install requirements
print_status "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating environment configuration..."
    cp env.example .env
    print_warning "Please edit .env file with your configuration before running the application"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p data

# Set permissions
print_status "Setting permissions..."
chmod +x run.py
chmod +x wsgi.py

print_status "Installation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run: source venv/bin/activate"
echo "3. Run: python run.py"
echo ""
echo "🔑 Default login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
print_warning "Remember to change the default password in production!"



