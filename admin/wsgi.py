"""
WSGI configuration for BlockCoop Admin Dashboard
Use this file for production deployment with Gunicorn or similar WSGI servers
"""

import os
import sys

# Add the admin directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from app import app, init_db

# Initialize database
init_db()

# Export the WSGI application
application = app

if __name__ == "__main__":
    app.run()



