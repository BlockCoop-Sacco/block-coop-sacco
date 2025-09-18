#!/usr/bin/env python3
"""
BlockCoop Admin Dashboard Startup Script
Run this script to start the admin dashboard
"""

import os
import sys
from app import app, init_db

def main():
    """Main startup function"""
    print("🚀 Starting BlockCoop Admin Dashboard...")
    
    # Initialize database
    print("📊 Initializing database...")
    init_db()
    
    # Get configuration
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"🌐 Starting server on {host}:{port}")
    print(f"🔧 Debug mode: {debug}")
    print("📱 Admin dashboard will be available at:")
    print(f"   http://{host}:{port}")
    print("🔑 Default login: admin / admin123")
    print("⚠️  Remember to change the default password in production!")
    
    # Start the Flask app
    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    main()



