#!/bin/bash

# Complete BlockCoop M-Pesa Backend Deployment Script
# Run this on your Contabo server after uploading your backend code

set -e

# Configuration
APP_DIR="/var/www/api.blockcoopsacco.com"
BACKEND_DIR="$APP_DIR/backend"
SERVICE_NAME="mpesa-backend"
DOMAIN="api.blockcoopsacco.com"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

echo "🚀 BlockCoop M-Pesa Backend Complete Deployment"
echo "================================================"

# Step 1: Install dependencies
print_step "Installing Node.js dependencies..."
cd $BACKEND_DIR
npm ci --only=production
print_success "Dependencies installed"

# Step 2: Create production environment file
print_step "Setting up environment configuration..."
if [ ! -f ".env.production" ]; then
    cp ../production-env-template.env .env.production
    print_warning "Environment file created. Please edit .env.production with your actual credentials!"
    print_warning "Required: M-Pesa credentials, blockchain private key, JWT secret"
else
    print_success "Environment file already exists"
fi

# Step 3: Setup database
print_step "Initializing database..."
sudo mkdir -p $APP_DIR/data
sudo chown -R www-data:www-data $APP_DIR/data
sudo chmod -R 755 $APP_DIR/data

# Create database initialization script
cat > $APP_DIR/scripts/init-db.js << 'EOF'
import { initializeDatabase } from '../backend/src/database/init.js';
import { logger } from '../backend/src/utils/logger.js';

async function setupDatabase() {
  try {
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

setupDatabase();
EOF

print_success "Database setup prepared"

# Step 4: Setup systemd service
print_step "Configuring systemd service..."
sudo cp ../systemd-service.service /etc/systemd/system/$SERVICE_NAME.service
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
print_success "Systemd service configured"

# Step 5: Setup Nginx
print_step "Configuring Nginx..."
sudo cp ../nginx-config.conf /etc/nginx/sites-available/$DOMAIN
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo nginx -t
print_success "Nginx configured"

# Step 6: Setup SSL certificate
print_step "Setting up SSL certificate..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@blockcoopsacco.com
print_success "SSL certificate configured"

# Step 7: Setup log rotation
print_step "Setting up log rotation..."
sudo tee /etc/logrotate.d/mpesa-backend > /dev/null << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload $SERVICE_NAME
    endscript
}
EOF
print_success "Log rotation configured"

# Step 8: Setup monitoring script
print_step "Setting up monitoring..."
cat > $APP_DIR/scripts/monitor.sh << 'EOF'
#!/bin/bash
LOG_FILE="/var/www/api.blockcoopsacco.com/logs/monitor.log"
API_URL="https://api.blockcoopsacco.com/api/health"

# Check service status
if ! systemctl is-active --quiet mpesa-backend; then
    echo "$(date): Service down, restarting..." >> $LOG_FILE
    sudo systemctl restart mpesa-backend
fi

# Check API health
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $API_URL || echo "000")
if [ "$HTTP_STATUS" != "200" ]; then
    echo "$(date): API health check failed (HTTP $HTTP_STATUS)" >> $LOG_FILE
fi

# Check disk space
DISK_USAGE=$(df $APP_DIR | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "$(date): Disk usage high: ${DISK_USAGE}%" >> $LOG_FILE
fi
EOF

chmod +x $APP_DIR/scripts/monitor.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/scripts/monitor.sh") | crontab -
print_success "Monitoring configured"

# Step 9: Start services
print_step "Starting services..."
sudo systemctl restart nginx
sudo systemctl start $SERVICE_NAME
print_success "Services started"

# Step 10: Verify deployment
print_step "Verifying deployment..."
sleep 5

# Check service status
if systemctl is-active --quiet $SERVICE_NAME; then
    print_success "M-Pesa backend service is running"
else
    print_error "M-Pesa backend service failed to start"
    sudo journalctl -u $SERVICE_NAME --no-pager -n 20
fi

# Check API health
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/health || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    print_success "API health check passed"
else
    print_warning "API health check failed (HTTP $HTTP_STATUS)"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo "✅ Backend URL: https://$DOMAIN"
echo "✅ Health Check: https://$DOMAIN/api/health"
echo "✅ Service Status: sudo systemctl status $SERVICE_NAME"
echo "✅ Logs: sudo journalctl -u $SERVICE_NAME -f"
echo ""
print_warning "IMPORTANT: Edit $BACKEND_DIR/.env.production with your actual credentials!"
print_warning "Then restart the service: sudo systemctl restart $SERVICE_NAME"
