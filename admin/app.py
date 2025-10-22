from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField, TextAreaField
from wtforms.validators import DataRequired, Length, Email, EqualTo
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import sqlite3
import requests
import os
import asyncio
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv
import secrets
import hashlib

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
    reset_token = db.Column(db.String(120))
    reset_token_expires = db.Column(db.DateTime)

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

class SignupForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=80)])
    email = StringField('Email', validators=[DataRequired(), Email(), Length(max=120)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=8)])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password', message='Passwords must match')])
    submit = SubmitField('Create Account')

class ForgotPasswordForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email(), Length(max=120)])
    submit = SubmitField('Send Reset Link')

class ResetPasswordForm(FlaskForm):
    token = StringField('Token', validators=[DataRequired()])
    password = PasswordField('New Password', validators=[DataRequired(), Length(min=8)])
    confirm_password = PasswordField('Confirm New Password', validators=[DataRequired(), EqualTo('password', message='Passwords must match')])
    submit = SubmitField('Reset Password')

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
        
        # Extract data for template with safe defaults
        transaction_stats = comprehensive_data.get('transaction_stats') or {}
        user_analytics = comprehensive_data.get('user_analytics') or {}
        performance_metrics = comprehensive_data.get('performance_metrics') or {}
        blockchain_data = comprehensive_data.get('blockchain_data') or {}
        api_status = comprehensive_data.get('api_status') or {}

        # Default-safe api_status structure
        api_status_safe = {
            'health': (api_status.get('health') if isinstance(api_status, dict) else None) or {'status': 'unknown'},
            'mpesa': (api_status.get('mpesa') if isinstance(api_status, dict) else None) or {'configured': False},
            'database': (api_status.get('database') if isinstance(api_status, dict) else None) or {'status': 'unknown'}
        }

        # Default-safe blockchain structure
        blockchain_safe = {
            'network': (blockchain_data.get('network') if isinstance(blockchain_data, dict) else None) or {'isConnected': False},
            'blocksToken': blockchain_data.get('blocksToken') if isinstance(blockchain_data, dict) else None,
            'usdt': blockchain_data.get('usdt') if isinstance(blockchain_data, dict) else None,
            'treasury': blockchain_data.get('treasury') if isinstance(blockchain_data, dict) else None,
            'market': (blockchain_data.get('market') if isinstance(blockchain_data, dict) else None) or {'blocksPriceUsd': None, 'volume24hUsd': None}
        }

        # Build status_counts for charts
        basic_stats = (transaction_stats.get('basic_stats') if isinstance(transaction_stats, dict) else None) or {}
        status_counts = {
            'completed': basic_stats.get('completed', 0) or 0,
            'failed': basic_stats.get('failed', 0) or 0,
            'pending': basic_stats.get('pending', 0) or 0,
            'cancelled': basic_stats.get('cancelled', 0) or 0,
            'timeout': basic_stats.get('timeout', 0) or 0,
        }

        # Simplify package stats for chart (expects packageId + count)
        pkg_raw = (transaction_stats.get('package_stats') if isinstance(transaction_stats, dict) else None) or []
        package_stats_chart = []
        try:
            for p in pkg_raw:
                pid = p.get('packageId') if isinstance(p, dict) else None
                cnt = p.get('total_purchases') if isinstance(p, dict) else None
                if pid is not None:
                    package_stats_chart.append({'packageId': pid, 'count': int(cnt or 0)})
        except Exception:
            package_stats_chart = []

        # Prepare stats for template
        stats = {
            'transaction_stats': transaction_stats,
            'user_analytics': user_analytics,
            'performance_metrics': performance_metrics,
            'blockchain_data': blockchain_safe,
            'api_status': api_status_safe,
            'status_counts': status_counts,
            'package_stats': package_stats_chart,
            'timestamp': comprehensive_data.get('timestamp')
        }
        
        return render_template('dashboard.html', stats=stats)
        
    except Exception as e:
        flash(f'Error loading dashboard: {str(e)}', 'error')
        # Return with safe defaults to avoid template errors
        safe_stats = {
            'transaction_stats': {},
            'user_analytics': {},
            'performance_metrics': {},
            'blockchain_data': {'network': {'isConnected': False}, 'market': {'blocksPriceUsd': None}},
            'api_status': {'health': {'status': 'unknown'}, 'mpesa': {'configured': False}, 'database': {'status': 'unknown'}},
            'status_counts': {},
            'package_stats': []
        }
        return render_template('dashboard.html', stats=safe_stats)

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

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    form = SignupForm()
    if form.validate_on_submit():
        existing = AdminUser.query.filter((AdminUser.username == form.username.data) | (AdminUser.email == form.email.data)).first()
        if existing:
            flash('Username or email already exists', 'error')
            return render_template('signup.html', form=form)
        user = AdminUser(
            username=form.username.data,
            email=form.email.data,
            role='admin'
        )
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Account created. Please log in.', 'success')
        return redirect(url_for('login'))
    return render_template('signup.html', form=form)

def _generate_reset_token() -> str:
    return secrets.token_urlsafe(32)

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    form = ForgotPasswordForm()
    if form.validate_on_submit():
        user = AdminUser.query.filter_by(email=form.email.data).first()
        if not user:
            flash('If that email exists, a reset link has been generated.', 'info')
            return redirect(url_for('login'))
        token = _generate_reset_token()
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        # In production, email the link. For now, display it securely in flash.
        flash(f'Password reset token: {token}', 'info')
        flash('Use the token at the reset password page within 1 hour.', 'info')
        return redirect(url_for('reset_password'))
    return render_template('forgot_password.html', form=form)

@app.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    form = ResetPasswordForm()
    if form.validate_on_submit():
        user = AdminUser.query.filter_by(reset_token=form.token.data).first()
        if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
            flash('Invalid or expired token', 'error')
            return render_template('reset_password.html', form=form)
        user.set_password(form.password.data)
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        flash('Password has been reset. Please log in.', 'success')
        return redirect(url_for('login'))
    return render_template('reset_password.html', form=form)

@app.route('/favicon.ico')
def favicon():
    return ('', 204, {'Content-Type': 'image/x-icon'})

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
    """View package statistics and details (on-chain)."""
    try:
        # Prefer on-chain stats so it reflects live purchases
        stats = blockchain_service.get_packages_stats()
        return render_template('packages.html', packages=stats)
    except Exception as e:
        flash(f'Error loading packages: {str(e)}', 'error')
        return render_template('packages.html', packages=[])

@app.route('/liquidity')
@login_required
def liquidity():
    """View liquidity pool information"""
    try:
        # Fetch real on-chain liquidity stats
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        chain_stats = loop.run_until_complete(blockchain_service.get_comprehensive_stats())
        loop.close()

        # Enrich with detailed pool stats
        pool_stats = blockchain_service.get_liquidity_stats()

        liquidity_data = {
            'total_liquidity_usd': (pool_stats.get('total_liquidity_usd') or 0),
            'active_pools': (pool_stats.get('active_pools') or 0),
            'daily_volume': (pool_stats.get('daily_volume_usd') or 0),
            'pools': (pool_stats.get('pools') or []),
            'network': chain_stats.get('network') if isinstance(chain_stats, dict) else {},
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

# Reports APIs
@app.route('/api/reports/revenue')
@login_required
def api_reports_revenue():
    try:
        # Optional block range query params
        from_block = request.args.get('fromBlock', type=int)
        to_block = request.args.get('toBlock', type=int)
        data = blockchain_service.get_reports_summary(from_block, to_block)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/referrals')
@login_required
def api_reports_referrals():
    try:
        latest = blockchain_service.w3.eth.block_number if blockchain_service.is_connected() else None
        to_block = request.args.get('toBlock', type=int) or latest
        from_block = request.args.get('fromBlock', type=int)
        if from_block is None:
            from_block = max(0, (to_block or 0) - 28800)
        data = blockchain_service.get_referral_payments(from_block, to_block)
        return jsonify({'range': {'from': from_block, 'to': to_block}, 'data': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/holders')
@login_required
def api_reports_holders():
    try:
        latest = blockchain_service.w3.eth.block_number if blockchain_service.is_connected() else None
        to_block = request.args.get('toBlock', type=int) or latest
        from_block = request.args.get('fromBlock', type=int)
        holder = request.args.get('holder')
        if from_block is None:
            from_block = max(0, (to_block or 0) - 5000)
        data = blockchain_service.get_blocks_transfers(from_block, to_block, holder)
        return jsonify({'range': {'from': from_block, 'to': to_block}, 'data': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/gas')
@login_required
def api_reports_gas():
    try:
        latest = blockchain_service.w3.eth.block_number if blockchain_service.is_connected() else None
        to_block = request.args.get('toBlock', type=int) or latest
        from_block = request.args.get('fromBlock', type=int)
        if from_block is None:
            from_block = max(0, (to_block or 0) - 2000)
        wallets_param = os.environ.get('OPERATOR_WALLETS', '')
        addrs = [w.strip() for w in wallets_param.split(',') if w.strip()]
        data = blockchain_service.get_gas_spend(addrs, from_block, to_block)
        return jsonify({'range': {'from': from_block, 'to': to_block}, 'data': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/reports/revenue')
@login_required
def reports_revenue():
    try:
        from_block = request.args.get('fromBlock', type=int)
        to_block = request.args.get('toBlock', type=int)
        # Reduce default scan window to avoid RPC timeouts when no range provided
        if from_block is None and to_block is None:
            try:
                latest = blockchain_service.w3.eth.block_number if blockchain_service.is_connected() else None
            except Exception:
                latest = None
            if latest is not None:
                to_block = latest
                from_block = max(0, latest - 5000)
        summary = blockchain_service.get_reports_summary(from_block, to_block)
        # Provide safe defaults if backend returns error or missing fields
        if not isinstance(summary, dict):
            summary = {}
        if 'revenue' not in summary or not isinstance(summary.get('revenue'), dict):
            summary['revenue'] = {'treasury_usd': 0.0, 'taxes_usd': 0.0}
        if 'range' not in summary or not isinstance(summary.get('range'), dict):
            summary['range'] = {'from': None, 'to': None}
        if 'referrals' not in summary or not isinstance(summary.get('referrals'), dict):
            summary['referrals'] = {'total': 0.0, 'byReferrer': {}}
        return render_template('reports_revenue.html', summary=summary)
    except Exception as e:
        flash(f'Error loading revenue report: {str(e)}', 'error')
        safe_summary = {
            'revenue': {'treasury_usd': 0.0, 'taxes_usd': 0.0},
            'range': {'from': None, 'to': None},
            'referrals': {'total': 0.0, 'byReferrer': {}}
        }
        return render_template('reports_revenue.html', summary=safe_summary)

@app.route('/reports/referrals')
@login_required
def reports_referrals():
    try:
        latest = blockchain_service.w3.eth.block_number if blockchain_service.is_connected() else None
        to_block = request.args.get('toBlock', type=int) or latest
        from_block = request.args.get('fromBlock', type=int)
        if from_block is None:
            from_block = max(0, (to_block or 0) - 28800)
        data = blockchain_service.get_referral_payments(from_block, to_block)
        return render_template('reports_referrals.html', data=data, from_block=from_block, to_block=to_block)
    except Exception as e:
        flash(f'Error loading referral report: {str(e)}', 'error')
        return render_template('reports_referrals.html', data={})

@app.route('/reports/holders')
@login_required
def reports_holders():
    try:
        latest = blockchain_service.w3.eth.block_number if blockchain_service.is_connected() else None
        to_block = request.args.get('toBlock', type=int) or latest
        from_block = request.args.get('fromBlock', type=int)
        holder = request.args.get('holder', type=str)
        if from_block is None:
            from_block = max(0, (to_block or 0) - 5000)
        data = blockchain_service.get_blocks_transfers(from_block, to_block, holder)
        return render_template('reports_holders.html', data=data, from_block=from_block, to_block=to_block, holder=holder)
    except Exception as e:
        flash(f'Error loading holders report: {str(e)}', 'error')
        return render_template('reports_holders.html', data={})

@app.route('/reports/vesting')
@login_required
def reports_vesting():
    try:
        wallets_param = request.args.get('wallets', '', type=str)
        wallets = [w.strip() for w in wallets_param.split(',') if w.strip()]
        data = blockchain_service.get_vesting_for_wallets(wallets) if wallets else []
        return render_template('reports_vesting.html', data=data, wallets=wallets_param)
    except Exception as e:
        flash(f'Error loading vesting report: {str(e)}', 'error')
        return render_template('reports_vesting.html', data=[], wallets='')

@app.route('/reports/gas')
@login_required
def reports_gas():
    try:
        latest = blockchain_service.w3.eth.block_number if blockchain_service.is_connected() else None
        to_block = request.args.get('toBlock', type=int) or latest
        from_block = request.args.get('fromBlock', type=int)
        if from_block is None:
            from_block = max(0, (to_block or 0) - 2000)
        wallets_param = request.args.get('wallets', '', type=str) or os.environ.get('OPERATOR_WALLETS', '')
        addrs = [w.strip() for w in wallets_param.split(',') if w.strip()]
        data = blockchain_service.get_gas_spend(addrs, from_block, to_block)
        return render_template('reports_gas.html', data=data, from_block=from_block, to_block=to_block, wallets=wallets_param)
    except Exception as e:
        flash(f'Error loading gas report: {str(e)}', 'error')
        return render_template('reports_gas.html', data={'byAddress': []}, wallets='')

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
        # Ensure new columns exist when upgrading existing deployments using SQLAlchemy engine
        try:
            engine = db.get_engine()
            with engine.connect() as connection:
                # Check column existence
                result = connection.execute(db.text("PRAGMA table_info('admin_user')"))
                existing_cols = {row[1] for row in result.fetchall()}
                if 'reset_token' not in existing_cols:
                    connection.execute(db.text("ALTER TABLE admin_user ADD COLUMN reset_token VARCHAR(120)"))
                if 'reset_token_expires' not in existing_cols:
                    connection.execute(db.text("ALTER TABLE admin_user ADD COLUMN reset_token_expires DATETIME"))
        except Exception as e:
            print(f"Admin DB migration check failed: {e}")
        
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
