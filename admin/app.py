from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField, TextAreaField
from wtforms.validators import DataRequired, Length, Email
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import sqlite3
import requests
import os
import asyncio
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv

# Import enhanced data services
from services.data_service import data_service
from services.blockchain_service import blockchain_service
from services.api_service import api_service

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-this')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///admin_users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'
CORS(app)

# Configuration
BLOCKCOOP_API_URL = os.environ.get('BLOCKCOOP_API_URL', 'http://localhost:3001')
MPESA_DB_PATH = os.environ.get('MPESA_DB_PATH', '../data/mpesa_development.db')

# User model for admin authentication
class AdminUser(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), default='admin')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# Forms
class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')

class CreditTransactionForm(FlaskForm):
    transaction_id = StringField('Transaction ID', validators=[DataRequired()])
    reason = TextAreaField('Reason for Credit', validators=[DataRequired()])
    submit = SubmitField('Credit Transaction')

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return AdminUser.query.get(int(user_id))

# Database connection helper
def get_mpesa_db_connection():
    """Get connection to the M-Pesa SQLite database"""
    try:
        conn = sqlite3.connect(MPESA_DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# Routes
@app.route('/')
@login_required
def dashboard():
    """Main dashboard with comprehensive real-time statistics"""
    try:
        # Get comprehensive dashboard data
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        comprehensive_data = loop.run_until_complete(data_service.get_comprehensive_dashboard_data())
        loop.close()
        
        # Extract data for template
        transaction_stats = comprehensive_data.get('transaction_stats', {})
        user_analytics = comprehensive_data.get('user_analytics', {})
        performance_metrics = comprehensive_data.get('performance_metrics', {})
        blockchain_data = comprehensive_data.get('blockchain_data', {})
        api_status = comprehensive_data.get('api_status', {})
        
        # Prepare stats for template
        stats = {
            'transaction_stats': transaction_stats,
            'user_analytics': user_analytics,
            'performance_metrics': performance_metrics,
            'blockchain_data': blockchain_data,
            'api_status': api_status,
            'timestamp': comprehensive_data.get('timestamp')
        }
        
        return render_template('dashboard.html', stats=stats)
        
    except Exception as e:
        flash(f'Error loading dashboard: {str(e)}', 'error')
        return render_template('dashboard.html', stats={})

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Admin login"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = AdminUser.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data) and user.is_active:
            login_user(user)
            user.last_login = datetime.utcnow()
            db.session.commit()
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password', 'error')
    
    return render_template('login.html', form=form)

@app.route('/logout')
@login_required
def logout():
    """Admin logout"""
    logout_user()
    flash('You have been logged out', 'info')
    return redirect(url_for('login'))

@app.route('/transactions')
@login_required
def transactions():
    """View all M-Pesa transactions"""
    try:
        conn = get_mpesa_db_connection()
        if not conn:
            flash('Database connection error', 'error')
            return render_template('transactions.html', transactions=[])
        
        cursor = conn.cursor()
        
        # Get filter parameters
        status_filter = request.args.get('status', '')
        search = request.args.get('search', '')
        
        # Build query
        query = "SELECT * FROM mpesa_transactions WHERE 1=1"
        params = []
        
        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)
        
        if search:
            query += " AND (phoneNumber LIKE ? OR walletAddress LIKE ? OR mpesaReceiptNumber LIKE ?)"
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])
        
        query += " ORDER BY createdAt DESC LIMIT 100"
        
        cursor.execute(query, params)
        transactions = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return render_template('transactions.html', transactions=transactions, 
                             status_filter=status_filter, search=search)
        
    except Exception as e:
        flash(f'Error loading transactions: {str(e)}', 'error')
        return render_template('transactions.html', transactions=[])

@app.route('/packages')
@login_required
def packages():
    """View package statistics and details"""
    try:
        conn = get_mpesa_db_connection()
        if not conn:
            flash('Database connection error', 'error')
            return render_template('packages.html', packages=[])
        
        cursor = conn.cursor()
        
        # Get package statistics
        cursor.execute("""
            SELECT 
                packageId,
                COUNT(*) as total_purchases,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_purchases,
                SUM(CASE WHEN status = 'completed' THEN amountUsd ELSE 0 END) as total_usd,
                SUM(CASE WHEN status = 'completed' THEN amountKes ELSE 0 END) as total_kes,
                AVG(CASE WHEN status = 'completed' THEN amountUsd ELSE NULL END) as avg_amount
            FROM mpesa_transactions 
            GROUP BY packageId
            ORDER BY total_purchases DESC
        """)
        
        packages = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return render_template('packages.html', packages=packages)
        
    except Exception as e:
        flash(f'Error loading packages: {str(e)}', 'error')
        return render_template('packages.html', packages=[])

@app.route('/liquidity')
@login_required
def liquidity():
    """View liquidity pool information"""
    try:
        # This would typically connect to blockchain or API to get liquidity data
        # For now, we'll show placeholder data
        liquidity_data = {
            'total_liquidity_usd': 0,
            'total_liquidity_kes': 0,
            'active_pools': 0,
            'daily_volume': 0
        }
        
        return render_template('liquidity.html', liquidity_data=liquidity_data)
        
    except Exception as e:
        flash(f'Error loading liquidity data: {str(e)}', 'error')
        return render_template('liquidity.html', liquidity_data={})

@app.route('/credit-transaction', methods=['GET', 'POST'])
@login_required
def credit_transaction():
    """Credit failed M-Pesa transactions"""
    form = CreditTransactionForm()
    
    if form.validate_on_submit():
        try:
            conn = get_mpesa_db_connection()
            if not conn:
                flash('Database connection error', 'error')
                return render_template('credit_transaction.html', form=form)
            
            cursor = conn.cursor()
            
            # Find the transaction
            cursor.execute("SELECT * FROM mpesa_transactions WHERE id = ?", (form.transaction_id.data,))
            transaction = cursor.fetchone()
            
            if not transaction:
                flash('Transaction not found', 'error')
                return render_template('credit_transaction.html', form=form)
            
            if transaction['status'] != 'failed':
                flash('Only failed transactions can be credited', 'error')
                return render_template('credit_transaction.html', form=form)
            
            # Update transaction status to completed
            cursor.execute("""
                UPDATE mpesa_transactions 
                SET status = 'completed', 
                    completedAt = ?,
                    errorMessage = ?
                WHERE id = ?
            """, (datetime.utcnow(), f"Credited by admin: {form.reason.data}", form.transaction_id.data))
            
            conn.commit()
            conn.close()
            
            flash('Transaction credited successfully!', 'success')
            return redirect(url_for('transactions'))
            
        except Exception as e:
            flash(f'Error crediting transaction: {str(e)}', 'error')
    
    return render_template('credit_transaction.html', form=form)

@app.route('/api/transaction/<transaction_id>')
@login_required
def get_transaction_details(transaction_id):
    """Get detailed transaction information"""
    try:
        conn = get_mpesa_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection error'}), 500
        
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM mpesa_transactions WHERE id = ?", (transaction_id,))
        transaction = cursor.fetchone()
        
        conn.close()
        
        if transaction:
            return jsonify(dict(transaction))
        else:
            return jsonify({'error': 'Transaction not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/failed')
@login_required
def get_failed_transactions():
    """Get all failed transactions for credit form"""
    try:
        conn = get_mpesa_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection error'}), 500
        
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM mpesa_transactions 
            WHERE status = 'failed' 
            ORDER BY createdAt DESC 
            LIMIT 20
        """)
        transactions = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify(transactions)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/data')
@login_required
def get_dashboard_data():
    """Get comprehensive dashboard data"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        data = loop.run_until_complete(data_service.get_comprehensive_dashboard_data())
        loop.close()
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/blockchain/stats')
@login_required
def get_blockchain_stats():
    """Get blockchain statistics"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        stats = loop.run_until_complete(blockchain_service.get_comprehensive_stats())
        loop.close()
        
        return jsonify(stats)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/status')
@login_required
def get_system_status():
    """Get system status"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        status = loop.run_until_complete(api_service.get_comprehensive_api_status())
        loop.close()
        
        return jsonify(status)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500

# Initialize database and create default admin user
def init_db():
    """Initialize database and create default admin user"""
    with app.app_context():
        db.create_all()
        
        # Create default admin user if none exists
        if not AdminUser.query.first():
            admin = AdminUser(
                username='admin',
                email='admin@blockcoopsacco.com',
                role='super_admin'
            )
            admin.set_password('admin123')  # Change this in production!
            db.session.add(admin)
            db.session.commit()
            print("Default admin user created: username=admin, password=admin123")

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=8080)
