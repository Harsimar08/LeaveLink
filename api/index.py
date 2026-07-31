import sys
import os

# Add backend_flask directory to python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend_flask'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app
