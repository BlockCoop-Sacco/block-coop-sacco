# BlockCoop Admin Dashboard

A comprehensive admin dashboard for managing BlockCoop Sacco operations, built with Python Flask and modern responsive UI.

## 🌟 Features

### 📊 Dashboard Overview
- Real-time transaction statistics
- Package performance metrics
- Success rate monitoring
- Interactive charts and graphs

### 💳 Transaction Management
- View all M-Pesa transactions
- Filter by status, phone number, wallet address
- Detailed transaction information
- Export capabilities

### 📦 Package Analytics
- Package popularity tracking
- Revenue analysis per package
- Success rate monitoring
- Performance comparisons

### 💰 Liquidity Pool Management
- Real-time liquidity information
- Pool performance tracking
- Volume analytics
- Integration with blockchain data

### 🔧 Admin Tools
- Credit failed M-Pesa transactions
- Manual transaction processing
- User management
- System monitoring

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- pip3
- Access to BlockCoop M-Pesa database

### Installation

1. **Clone and navigate to admin directory:**
   ```bash
   cd /root/block-coop-sacco/admin
   ```

2. **Run the installation script:**
   ```bash
   ./install.sh
   ```

3. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start the application:**
   ```bash
   source venv/bin/activate
   python run.py
   ```

5. **Access the dashboard:**
   - URL: http://localhost:5000
   - Username: `admin`
   - Password: `admin123`

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
SECRET_KEY=your-super-secret-key-change-this-in-production
BLOCKCOOP_API_URL=http://localhost:3001
MPESA_DB_PATH=../data/mpesa_development.db
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
```

### Database Configuration

The admin dashboard connects to the existing M-Pesa SQLite database. Ensure the path in `MPESA_DB_PATH` points to the correct database file.

## 🚀 Production Deployment

### Using the Deployment Script

1. **Run the deployment script as root:**
   ```bash
   sudo ./deploy.sh
   ```

2. **Configure SSL certificates:**
   - Update Nginx configuration with your SSL certificates
   - Ensure domain `api.blockcoopsacco.com` points to your server

3. **Configure firewall:**
   ```bash
   ufw allow 80
   ufw allow 443
   ufw allow 22
   ```

### Manual Deployment

1. **Install dependencies:**
   ```bash
   apt-get update
   apt-get install -y python3 python3-pip python3-venv nginx gunicorn
   ```

2. **Set up virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pip install gunicorn
   ```

3. **Configure systemd service:**
   ```bash
   cp blockcoop-admin.service /etc/systemd/system/
   systemctl daemon-reload
   systemctl enable blockcoop-admin
   systemctl start blockcoop-admin
   ```

4. **Configure Nginx:**
   ```bash
   cp nginx.conf /etc/nginx/sites-available/blockcoop-admin
   ln -s /etc/nginx/sites-available/blockcoop-admin /etc/nginx/sites-enabled/
   nginx -t
   systemctl reload nginx
   ```

## 📱 Usage

### Dashboard
- View real-time statistics and metrics
- Monitor transaction success rates
- Track package performance

### Transactions
- Browse all M-Pesa transactions
- Filter by status, phone, or wallet address
- View detailed transaction information
- Export transaction data

### Packages
- Analyze package popularity
- Monitor revenue per package
- Track success rates
- Compare package performance

### Liquidity Pools
- View real-time liquidity data
- Monitor pool performance
- Track trading volume
- Manage pool operations

### Credit Transactions
- Credit failed M-Pesa payments
- Provide reasons for manual crediting
- Track credit operations
- Maintain audit trail

## 🔒 Security

### Authentication
- Secure admin login system
- Session management
- Password hashing with bcrypt
- Role-based access control

### Data Protection
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure headers

### Production Security
- Change default admin password
- Use strong SECRET_KEY
- Enable HTTPS
- Configure firewall
- Regular security updates

## 🛠️ Development

### Project Structure
```
admin/
├── app.py                 # Main Flask application
├── run.py                 # Development server
├── wsgi.py                # Production WSGI entry point
├── requirements.txt       # Python dependencies
├── install.sh            # Installation script
├── deploy.sh             # Deployment script
├── blockcoop-admin.service # Systemd service file
├── templates/            # HTML templates
│   ├── base.html         # Base template
│   ├── login.html        # Login page
│   ├── dashboard.html    # Main dashboard
│   ├── transactions.html # Transaction management
│   ├── packages.html     # Package analytics
│   ├── liquidity.html    # Liquidity management
│   ├── credit_transaction.html # Credit form
│   ├── 404.html          # Error pages
│   └── 500.html
└── README.md             # This file
```

### Adding New Features

1. **Create new routes in `app.py`**
2. **Add corresponding templates**
3. **Update navigation in `base.html`**
4. **Test thoroughly**
5. **Update documentation**

### Database Schema

The admin dashboard uses the existing M-Pesa transaction database. Key tables:
- `mpesa_transactions` - All M-Pesa payment records
- `admin_users` - Admin user accounts (created by Flask)

## 📊 Monitoring

### Logs
- Application logs: `logs/`
- System logs: `journalctl -u blockcoop-admin`
- Nginx logs: `/var/log/nginx/`

### Health Checks
- Dashboard accessible at `/`
- Health endpoint: `/api/health`
- Service status: `systemctl status blockcoop-admin`

## 🔧 Troubleshooting

### Common Issues

1. **Database connection error:**
   - Check `MPESA_DB_PATH` in `.env`
   - Ensure database file exists and is readable
   - Verify SQLite installation

2. **Service won't start:**
   - Check logs: `journalctl -u blockcoop-admin -f`
   - Verify virtual environment
   - Check file permissions

3. **Nginx configuration error:**
   - Test config: `nginx -t`
   - Check syntax in configuration file
   - Verify SSL certificates

4. **Login issues:**
   - Reset admin password in database
   - Check session configuration
   - Verify SECRET_KEY

### Support

For technical support:
1. Check application logs
2. Review system logs
3. Verify configuration
4. Test database connectivity
5. Check network connectivity

## 📄 License

This project is part of the BlockCoop Sacco platform and follows the same licensing terms.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**⚠️ Security Notice:** Always change the default admin password and use strong security practices in production environments.



