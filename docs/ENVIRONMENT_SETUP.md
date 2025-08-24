# Environment Setup Guide

## Overview

This guide covers the complete setup process for the M-Pesa payment integration in the BlockCoop Sacco project, including development, testing, and production environments.

## Prerequisites

### System Requirements

- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (or yarn/pnpm equivalent)
- **Git**: For version control
- **ngrok**: For local development with M-Pesa callbacks (optional)

### M-Pesa Requirements

- **Safaricom Developer Account**: Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
- **M-Pesa App**: Create an app in the Safaricom Developer Portal
- **Business Short Code**: Obtain from Safaricom (use 174379 for sandbox)

## Development Environment Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd BlockCoopCpanel/frontend

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

### 2. Backend Environment Configuration

Create environment files in the `backend` directory:

```bash
# Copy example environment file
cp .env.example .env

# Copy test environment file
cp .env.example .env.test
```

### 3. Configure M-Pesa Credentials

Edit `backend/.env` with your M-Pesa sandbox credentials:

```env
# M-Pesa Sandbox Configuration
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your_passkey_here
MPESA_INITIATOR_NAME=testapi
MPESA_SECURITY_CREDENTIAL=your_security_credential_here

# Callback URLs (use ngrok for local development)
CALLBACK_BASE_URL=https://your-ngrok-url.ngrok.io
MPESA_CALLBACK_URL=${CALLBACK_BASE_URL}/api/mpesa/callback
MPESA_TIMEOUT_URL=${CALLBACK_BASE_URL}/api/mpesa/timeout
```

### 4. Blockchain Configuration

Configure blockchain settings in `backend/.env`:

```env
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BLOCKCHAIN_CHAIN_ID=97
USDT_CONTRACT_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
PACKAGE_MANAGER_CONTRACT_ADDRESS=your_package_manager_address
TREASURY_WALLET_ADDRESS=your_treasury_wallet_address
TREASURY_PRIVATE_KEY=your_treasury_private_key
```

### 5. Frontend Environment Configuration

Create `frontend/.env.local`:

```env
# M-Pesa API Configuration
VITE_MPESA_API_URL=http://localhost:3001/api

# Blockchain Configuration (should match backend)
VITE_BLOCKCHAIN_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
VITE_BLOCKCHAIN_CHAIN_ID=97
```

### 6. Database Setup

The backend uses SQLite by default for development:

```bash
# Database will be created automatically on first run
# Location: backend/data/mpesa_transactions.db
```

### 7. Start Development Servers

```bash
# Terminal 1: Start backend server
cd backend
npm run dev

# Terminal 2: Start frontend development server
cd frontend
npm run dev

# Terminal 3: Start ngrok for M-Pesa callbacks (optional)
ngrok http 3001
```

## M-Pesa Sandbox Setup

### 1. Create Safaricom Developer Account

1. Visit [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Register for a new account
3. Verify your email address
4. Complete your profile

### 2. Create M-Pesa App

1. Log in to the developer portal
2. Click "Create App"
3. Select "Lipa Na M-Pesa Online"
4. Fill in app details:
   - **App Name**: BlockCoop M-Pesa Integration
   - **Description**: M-Pesa payment integration for USDT packages
   - **Environment**: Sandbox

### 3. Get API Credentials

After creating the app, you'll receive:
- **Consumer Key**
- **Consumer Secret**
- **Passkey** (for STK Push)

### 4. Configure Callback URLs

In your M-Pesa app settings, configure:
- **Validation URL**: `https://your-domain.com/api/mpesa/validate`
- **Confirmation URL**: `https://your-domain.com/api/mpesa/confirm`

### 5. Test Phone Numbers

Use these Safaricom sandbox test numbers:
- **254708374149**: For successful transactions
- **254708374150**: For failed transactions
- **254708374151**: For timeout scenarios

## Testing Environment

### 1. Configure Test Environment

Edit `backend/.env.test`:

```env
NODE_ENV=test
DATABASE_URL=:memory:
MPESA_ENVIRONMENT=sandbox

# Use test credentials
MPESA_CONSUMER_KEY=test_consumer_key
MPESA_CONSUMER_SECRET=test_consumer_secret
```

### 2. Run Tests

```bash
# Run all tests
cd backend
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run M-Pesa sandbox tests (requires valid credentials)
npm run test:sandbox
```

## Production Environment Setup

### 1. Server Requirements

- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 50GB SSD
- **OS**: Ubuntu 20.04 LTS or similar
- **Node.js**: Version 18.0+
- **PM2**: For process management
- **Nginx**: For reverse proxy and SSL termination

### 2. Production Environment Variables

Create `backend/.env.production`:

```env
NODE_ENV=production
PORT=3001

# M-Pesa Production Configuration
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=your_production_consumer_key
MPESA_CONSUMER_SECRET=your_production_consumer_secret
MPESA_BUSINESS_SHORT_CODE=your_production_short_code
MPESA_PASSKEY=your_production_passkey

# Production URLs
MPESA_BASE_URL=https://api.safaricom.co.ke
CALLBACK_BASE_URL=https://your-domain.com
CORS_ORIGIN=https://your-frontend-domain.com

# Database (use PostgreSQL for production)
DATABASE_URL=postgresql://user:password@localhost:5432/mpesa_db

# Security
JWT_SECRET=your_secure_jwt_secret
API_KEY=your_secure_api_key
API_RATE_LIMIT=100

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/mpesa-backend/app.log
```

### 3. Database Setup (PostgreSQL)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE mpesa_db;
CREATE USER mpesa_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE mpesa_db TO mpesa_user;
\q

# Update connection string in .env.production
DATABASE_URL=postgresql://mpesa_user:secure_password@localhost:5432/mpesa_db
```

### 4. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 5. Nginx Configuration

Create `/etc/nginx/sites-available/mpesa-backend`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6. PM2 Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'mpesa-backend',
    script: 'src/server.js',
    cwd: '/path/to/backend',
    env: {
      NODE_ENV: 'production'
    },
    instances: 2,
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    error_file: '/var/log/mpesa-backend/error.log',
    out_file: '/var/log/mpesa-backend/out.log',
    log_file: '/var/log/mpesa-backend/combined.log'
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

## Security Considerations

### 1. Environment Variables

- Never commit `.env` files to version control
- Use strong, unique passwords and API keys
- Rotate credentials regularly
- Use environment-specific configurations

### 2. Network Security

- Configure firewall to allow only necessary ports
- Use HTTPS for all communications
- Implement rate limiting
- Monitor for suspicious activity

### 3. Database Security

- Use strong database passwords
- Enable database encryption at rest
- Regular database backups
- Limit database access to application only

### 4. Application Security

- Keep dependencies updated
- Use security headers (helmet.js)
- Implement input validation
- Log security events

## Monitoring and Logging

### 1. Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs mpesa-backend

# Application metrics
pm2 show mpesa-backend
```

### 2. Log Management

Configure log rotation in `/etc/logrotate.d/mpesa-backend`:

```
/var/log/mpesa-backend/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Troubleshooting

### Common Issues

1. **M-Pesa Authentication Errors**
   - Verify consumer key and secret
   - Check if credentials are for correct environment
   - Ensure base64 encoding is correct

2. **Callback URL Issues**
   - Verify ngrok is running for development
   - Check firewall settings for production
   - Ensure HTTPS is properly configured

3. **Database Connection Errors**
   - Verify database credentials
   - Check if database service is running
   - Ensure proper network connectivity

4. **CORS Errors**
   - Verify CORS_ORIGIN environment variable
   - Check frontend URL configuration
   - Ensure proper headers are set

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
VERBOSE_TESTS=true
```

### Health Checks

Monitor application health:

```bash
# Backend health check
curl https://your-domain.com/api/health

# Recovery service health
curl -H "x-api-key: your_api_key" https://your-domain.com/api/recovery/health
```

## Backup and Recovery

### 1. Database Backups

```bash
# PostgreSQL backup
pg_dump -U mpesa_user -h localhost mpesa_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/var/backups/mpesa"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U mpesa_user -h localhost mpesa_db | gzip > $BACKUP_DIR/mpesa_backup_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### 2. Application Backups

```bash
# Backup application files
tar -czf mpesa_app_backup_$(date +%Y%m%d).tar.gz /path/to/application

# Backup environment files (excluding secrets)
cp .env.production .env.production.backup
```

This completes the environment setup guide. Follow these steps carefully to ensure a secure and reliable M-Pesa payment integration.
