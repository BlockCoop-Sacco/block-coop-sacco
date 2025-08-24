# M-Pesa Integration Troubleshooting Guide

## Common Issues and Solutions

### 1. M-Pesa Authentication Issues

#### Problem: "Failed to authenticate with M-Pesa"
**Symptoms:**
- 401 Unauthorized errors
- "Invalid consumer key" messages
- Authentication failures in logs

**Diagnosis:**
```bash
# Check M-Pesa credentials
curl -X GET "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" \
  -H "Authorization: Basic $(echo -n 'consumer_key:consumer_secret' | base64)"
```

**Solutions:**
1. **Verify Credentials:**
   - Check consumer key and secret in environment variables
   - Ensure credentials match your M-Pesa app
   - Verify environment (sandbox vs production)

2. **Check Base64 Encoding:**
   ```bash
   # Correct encoding format
   echo -n "consumer_key:consumer_secret" | base64
   ```

3. **Environment Mismatch:**
   - Sandbox credentials won't work in production
   - Verify `MPESA_ENVIRONMENT` setting

#### Problem: "Access token expired"
**Symptoms:**
- Intermittent authentication failures
- "Token expired" errors

**Solutions:**
1. **Check Token Caching:**
   ```javascript
   // Verify token expiry logic
   if (this.tokenExpiry && Date.now() < this.tokenExpiry) {
     return this.accessToken;
   }
   ```

2. **Reduce Token Lifetime:**
   ```javascript
   // Set expiry to 55 minutes instead of 60
   this.tokenExpiry = Date.now() + (55 * 60 * 1000);
   ```

### 2. STK Push Issues

#### Problem: "STK Push not received on phone"
**Symptoms:**
- Payment initiated successfully
- No STK push notification on phone
- Transaction stuck in pending state

**Diagnosis:**
```bash
# Check STK push status
curl -X GET "https://your-domain.com/api/mpesa/status/ws_CO_123456789"
```

**Solutions:**
1. **Phone Number Format:**
   - Ensure format is 254XXXXXXXXX
   - Remove spaces, dashes, or special characters
   - Verify phone number is M-Pesa registered

2. **Network Issues:**
   - Check if phone has network connectivity
   - Try with different phone number
   - Verify with Safaricom test numbers

3. **Business Short Code:**
   - Verify correct short code for environment
   - Sandbox: 174379
   - Production: Your assigned short code

#### Problem: "STK Push timeout"
**Symptoms:**
- ResultCode 1037 in callbacks
- Transactions timing out after 2 minutes

**Solutions:**
1. **User Education:**
   - Provide clear instructions to users
   - Set expectations about timing
   - Add timeout warnings in UI

2. **Retry Mechanism:**
   ```javascript
   // Implement retry for timeouts
   if (resultCode === '1037') {
     // Allow user to retry payment
     this.showRetryOption();
   }
   ```

### 3. Callback Issues

#### Problem: "Callbacks not received"
**Symptoms:**
- Payments complete but status not updated
- No callback logs in server
- Transactions stuck in pending

**Diagnosis:**
```bash
# Check callback URL accessibility
curl -X POST "https://your-domain.com/api/mpesa/callback/test-id" \
  -H "Content-Type: application/json" \
  -d '{"test": "callback"}'
```

**Solutions:**
1. **URL Configuration:**
   - Verify callback URL in M-Pesa app settings
   - Ensure HTTPS is used (required for production)
   - Check URL is publicly accessible

2. **Firewall/Security:**
   - Whitelist Safaricom IP addresses
   - Check server firewall settings
   - Verify SSL certificate validity

3. **ngrok for Development:**
   ```bash
   # Start ngrok tunnel
   ngrok http 3001
   
   # Update callback URL
   CALLBACK_BASE_URL=https://abc123.ngrok.io
   ```

#### Problem: "Invalid callback data"
**Symptoms:**
- Callbacks received but parsing fails
- "Failed to parse M-Pesa callback data" errors

**Solutions:**
1. **Data Structure Validation:**
   ```javascript
   // Check callback structure
   if (!callbackBody.Body?.stkCallback) {
     throw new Error('Invalid callback structure');
   }
   ```

2. **Log Raw Callbacks:**
   ```javascript
   // Add detailed logging
   logger.info('Raw callback received:', JSON.stringify(callbackBody));
   ```

### 4. Database Issues

#### Problem: "Database connection failed"
**Symptoms:**
- "ECONNREFUSED" errors
- Database timeout errors
- Application startup failures

**Diagnosis:**
```bash
# Test database connection
psql -h hostname -U username -d database_name -c "SELECT 1;"
```

**Solutions:**
1. **Connection String:**
   - Verify DATABASE_URL format
   - Check username, password, host, port
   - Ensure database exists

2. **Connection Limits:**
   ```javascript
   // Increase connection pool size
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

3. **SQLite Issues (Development):**
   ```bash
   # Check file permissions
   ls -la backend/data/
   
   # Ensure directory exists
   mkdir -p backend/data
   ```

### 5. Blockchain Integration Issues

#### Problem: "Blockchain transaction failed"
**Symptoms:**
- M-Pesa payment successful
- Blockchain transaction fails
- "Insufficient gas" or "Nonce error" messages

**Diagnosis:**
```bash
# Check blockchain connectivity
curl -X POST "https://your-rpc-url" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Solutions:**
1. **Gas Issues:**
   ```javascript
   // Increase gas limit
   const gasLimit = await contract.estimateGas.purchase(packageId, referrer);
   const tx = await contract.purchase(packageId, referrer, {
     gasLimit: gasLimit.mul(120).div(100) // 20% buffer
   });
   ```

2. **Nonce Management:**
   ```javascript
   // Get nonce manually
   const nonce = await provider.getTransactionCount(wallet.address, 'pending');
   const tx = await contract.purchase(packageId, referrer, { nonce });
   ```

3. **RPC Issues:**
   - Try different RPC endpoints
   - Check RPC rate limits
   - Verify network connectivity

### 6. Performance Issues

#### Problem: "Slow API responses"
**Symptoms:**
- Response times > 5 seconds
- Timeout errors
- Poor user experience

**Diagnosis:**
```bash
# Monitor response times
curl -w "@curl-format.txt" -s -o /dev/null "https://your-domain.com/api/health"
```

**Solutions:**
1. **Database Optimization:**
   ```sql
   -- Add indexes for common queries
   CREATE INDEX idx_mpesa_wallet_status ON mpesa_transactions(user_wallet_address, status);
   CREATE INDEX idx_mpesa_created_at ON mpesa_transactions(created_at);
   ```

2. **Caching:**
   ```javascript
   // Cache exchange rates
   const redis = require('redis');
   const client = redis.createClient();
   
   // Cache for 1 hour
   await client.setex('exchange_rate_usd_kes', 3600, rate);
   ```

3. **Connection Pooling:**
   ```javascript
   // Optimize database connections
   const pool = new Pool({
     max: 10,
     min: 2,
     acquire: 30000,
     idle: 10000
   });
   ```

### 7. Security Issues

#### Problem: "Suspicious payment patterns detected"
**Symptoms:**
- Fraud detection alerts
- Multiple failed payments
- Unusual transaction patterns

**Solutions:**
1. **Review Fraud Rules:**
   ```javascript
   // Adjust fraud detection thresholds
   const suspiciousPatterns = [];
   if (recentTransactions.length > 5) { // Increase threshold
     suspiciousPatterns.push('multiple_transactions');
   }
   ```

2. **IP Monitoring:**
   ```bash
   # Check for suspicious IPs
   grep "suspicious" /var/log/mpesa-backend/combined.log | \
   awk '{print $1}' | sort | uniq -c | sort -nr
   ```

3. **Rate Limiting:**
   ```javascript
   // Implement stricter rate limits
   const strictLimit = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 5, // Reduce from default
     message: 'Too many payment attempts'
   });
   ```

## Monitoring and Diagnostics

### 1. Health Check Endpoints

```bash
# Application health
curl https://your-domain.com/api/health

# M-Pesa connectivity
curl https://your-domain.com/api/mpesa/health

# Database health
curl https://your-domain.com/api/db/health

# Recovery service health
curl -H "x-api-key: $API_KEY" https://your-domain.com/api/recovery/health
```

### 2. Log Analysis

```bash
# Check error logs
tail -f /var/log/mpesa-backend/error.log

# Search for specific errors
grep "M-Pesa API Error" /var/log/mpesa-backend/combined.log

# Monitor payment failures
grep "Payment failed" /var/log/mpesa-backend/combined.log | tail -20

# Check callback processing
grep "callback" /var/log/mpesa-backend/combined.log | tail -10
```

### 3. Database Queries

```sql
-- Check recent transactions
SELECT * FROM mpesa_transactions 
WHERE created_at > NOW() - INTERVAL '1 hour' 
ORDER BY created_at DESC;

-- Check stuck transactions
SELECT * FROM mpesa_transactions 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '30 minutes';

-- Payment success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM mpesa_transactions 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### 4. Performance Monitoring

```bash
# Check system resources
top -p $(pgrep -f "node.*server.js")

# Monitor memory usage
ps aux | grep node | grep -v grep

# Check disk space
df -h

# Monitor network connections
netstat -an | grep :3001
```

## Recovery Procedures

### 1. Stuck Transaction Recovery

```bash
# Manual recovery for specific transaction
curl -X POST -H "x-api-key: $API_KEY" \
  "https://your-domain.com/api/recovery/manual/transaction-id" \
  -d '{"action": "retry_mpesa_query"}'

# Bulk recovery process
curl -X POST -H "x-api-key: $API_KEY" \
  "https://your-domain.com/api/recovery/process"
```

### 2. Service Restart

```bash
# Restart application
pm2 restart mpesa-backend

# Restart with logs
pm2 restart mpesa-backend --log

# Reload configuration
pm2 reload mpesa-backend
```

### 3. Database Recovery

```bash
# Check database integrity
psql -d database_name -c "SELECT pg_database_size('database_name');"

# Vacuum and analyze
psql -d database_name -c "VACUUM ANALYZE;"

# Restore from backup if needed
psql -d database_name < backup_file.sql
```

## Emergency Procedures

### 1. Disable M-Pesa Payments

```bash
# Emergency disable via feature flag
curl -X POST -H "x-api-key: $API_KEY" \
  "https://your-domain.com/api/admin/feature-flags" \
  -d '{"feature": "mpesa_payments", "enabled": false}'
```

### 2. Rollback Deployment

```bash
# Quick rollback
git checkout previous-stable-tag
npm ci --only=production
pm2 restart mpesa-backend
```

### 3. Contact Information

**Emergency Contacts:**
- **Technical Lead**: [Phone] - [Email]
- **DevOps Team**: [Phone] - [Email]
- **Safaricom Support**: +254 722 000 000
- **Hosting Provider**: [Support Number]

**Escalation Matrix:**
1. **Level 1**: Development Team (0-30 minutes)
2. **Level 2**: Technical Lead (30-60 minutes)
3. **Level 3**: Management Team (60+ minutes)

## Prevention Strategies

### 1. Monitoring Setup

- Set up alerts for error rates > 5%
- Monitor payment success rates < 95%
- Alert on high response times > 5 seconds
- Monitor database connection issues

### 2. Regular Maintenance

- Weekly log review and cleanup
- Monthly performance optimization
- Quarterly security audits
- Regular backup testing

### 3. Documentation Updates

- Keep troubleshooting guide current
- Document new issues and solutions
- Update contact information regularly
- Review and update procedures quarterly
