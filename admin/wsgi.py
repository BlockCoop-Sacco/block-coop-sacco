"""
WSGI configuration for BlockCoop Admin Dashboard
Mounts the Flask app under both "/" and "/admin" using DispatcherMiddleware so
the portal is fully accessible at https://<host>/admin while preserving the
existing root mounting for backward compatibility.
"""

import os
import sys

# Add the admin directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from werkzeug.middleware.dispatcher import DispatcherMiddleware

from app import app, init_db

# Initialize database
init_db()

# Mount the app at root and also at /admin
application = DispatcherMiddleware(app, {
    '/admin': app,
})

if __name__ == "__main__":
    # Run a simple dev server if invoked directly
    from werkzeug.serving import run_simple
    run_simple('0.0.0.0', int(os.environ.get('FLASK_PORT', 5000)), application, use_debugger=False, use_reloader=False)



