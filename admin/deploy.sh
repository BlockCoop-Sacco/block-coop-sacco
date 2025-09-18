#!/bin/bash

# BlockCoop Admin Dashboard Deployment Script
# This script deploys the admin dashboard to production

set -e

echo "🚀 Deploying BlockCoop Admin Dashboard..."

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

# Configuration
ADMIN_DIR="/root/block-coop-sacco/admin"
SERVICE_NAME="blockcoop-admin"
NGINX_CONFIG="/etc/nginx/sites-available/blockcoop-admin"
NGINX_ENABLED="/etc/nginx/sites-enabled/blockcoop-admin"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Install system dependencies
print_status "Installing system dependencies..."
apt-get update
apt-get install -y python3 python3-pip python3-venv nginx gunicorn

# Navigate to admin directory
cd $ADMIN_DIR

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
print_status "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p data
chown -R www-data:www-data logs data

# Set permissions
print_status "Setting permissions..."
chmod +x run.py
chmod +x wsgi.py
chmod +x install.sh
chown -R www-data:www-data .

# Create systemd service
print_status "Creating systemd service..."
cp blockcoop-admin.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable $SERVICE_NAME

# Create Nginx configuration
print_status "Creating Nginx configuration..."
cat > $NGINX_CONFIG << 'EOF'
server {
    listen 80;
    server_name api.blockcoopsacco.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.blockcoopsacco.com;

    # SSL configuration (you'll need to add your SSL certificates)
    # ssl_certificate /path/to/your/certificate.crt;
    # ssl_certificate_key /path/to/your/private.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Proxy to Flask app
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Static files (if any)
    location /static {
        alias /root/block-coop-sacco/admin/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable Nginx site
print_status "Enabling Nginx site..."
ln -sf $NGINX_CONFIG $NGINX_ENABLED
nginx -t && systemctl reload nginx

# Start the service
print_status "Starting admin dashboard service..."
systemctl start $SERVICE_NAME
systemctl status $SERVICE_NAME --no-pager

print_status "Deployment completed successfully!"
echo ""
echo "📋 Service Information:"
echo "   Service: $SERVICE_NAME"
echo "   Status: $(systemctl is-active $SERVICE_NAME)"
echo "   URL: https://api.blockcoopsacco.com"
echo ""
echo "🔧 Management Commands:"
echo "   Start:   systemctl start $SERVICE_NAME"
echo "   Stop:    systemctl stop $SERVICE_NAME"
echo "   Restart: systemctl restart $SERVICE_NAME"
echo "   Status:  systemctl status $SERVICE_NAME"
echo "   Logs:    journalctl -u $SERVICE_NAME -f"
echo ""
echo "🔑 Default login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
print_warning "Important:"
echo "1. Configure SSL certificates in Nginx configuration"
echo "2. Change the default admin password"
echo "3. Update environment variables in .env file"
echo "4. Configure firewall to allow HTTPS traffic"



