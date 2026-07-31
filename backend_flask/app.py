from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from datetime import timedelta
import os
from dotenv import load_dotenv
from sqlalchemy import text

# Load environment variables
load_dotenv()

# Import extensions
from extensions import db, jwt

# Initialize Flask app
app = Flask(__name__)

# Disable strict slashes to prevent 308 redirects that break CORS
app.url_map.strict_slashes = False

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-this')

db_url = os.getenv('DATABASE_URL')
# On serverless (Vercel) or when DATABASE_URL is not set / points to unreachable localhost MySQL, use SQLite for zero-config reliability
if not db_url or ('localhost' in db_url and os.getenv('VERCEL')):
    base_dir = '/tmp' if os.getenv('VERCEL') else os.path.dirname(__file__)
    db_path = os.path.join(base_dir, 'leavelink.db')
    db_url = f'sqlite:///{db_path}'
elif db_url.startswith('postgres://') or db_url.startswith('postgresql://'):
    if '+pg8000' not in db_url and '+psycopg2' not in db_url:
        db_url = db_url.replace('postgres://', 'postgresql+pg8000://', 1)
        db_url = db_url.replace('postgresql://', 'postgresql+pg8000://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'jwt-secret-key-change-this')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

# Upload configuration
base_upload_dir = '/tmp/uploads' if os.getenv('VERCEL') else os.path.join(os.path.dirname(__file__), 'uploads')
app.config['UPLOAD_FOLDER'] = base_upload_dir
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Session configuration for OAuth
app.config['SESSION_COOKIE_NAME'] = 'leavelink_session'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)

# Initialize extensions with app
db.init_app(app)
jwt.init_app(app)

# JWT error handlers
@jwt.invalid_token_loader
def invalid_token_callback(error_string):
    return jsonify({
        'success': False,
        'message': 'Invalid token',
        'error': error_string
    }), 422

@jwt.unauthorized_loader
def unauthorized_callback(error_string):
    return jsonify({
        'success': False,
        'message': 'Missing authorization header',
        'error': error_string
    }), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'success': False,
        'message': 'Token has expired'
    }), 401

# CORS configuration
CORS(app, 
     origins='*',
     supports_credentials=True,
     methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'])

# Import models (after db initialization) - moved to bottom
# Import routes
from routes.auth import auth_bp
from routes.users import users_bp
from routes.leaves import leaves_bp
from routes.oauth import oauth_bp, init_oauth
from routes.holidays import holidays_bp

# Initialize OAuth
init_oauth(app)

# Register blueprints for both /api/* and /* to handle any Vercel serverless path stripping
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(leaves_bp, url_prefix='/api/leaves')
app.register_blueprint(oauth_bp, url_prefix='/api/auth')
app.register_blueprint(holidays_bp, url_prefix='/api/holidays')

app.register_blueprint(auth_bp, url_prefix='/auth', name='auth_direct')
app.register_blueprint(users_bp, url_prefix='/users', name='users_direct')
app.register_blueprint(leaves_bp, url_prefix='/leaves', name='leaves_direct')
app.register_blueprint(holidays_bp, url_prefix='/holidays', name='holidays_direct')

# Root route
@app.route('/')
def index():
    return jsonify({
        'message': '🚀 LeaveLink API Server (Flask)',
        'version': '2.0.0',
        'database': 'MySQL',
        'endpoints': {
            'auth': '/api/auth (register, login, me)',
            'users': '/api/users',
            'leaves': '/api/leaves',
            'health': '/api/health'
        },
        'status': 'running'
    })

# Uploaded documents route
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# API root route
@app.route('/api')
def api_root():
    return jsonify({
        'message': '✅ LeaveLink API is running',
        'version': '2.0.0',
        'database': 'MySQL',
        'endpoints': {
            'auth': {
                'register': 'POST /api/auth/register',
                'login': 'POST /api/auth/login',
                'me': 'GET /api/auth/me'
            },
            'users': {
                'get_all': 'GET /api/users',
                'get_one': 'GET /api/users/:id',
                'update': 'PUT /api/users/:id',
                'delete': 'DELETE /api/users/:id'
            },
            'leaves': {
                'create': 'POST /api/leaves',
                'get_all': 'GET /api/leaves',
                'get_one': 'GET /api/leaves/:id',
                'update': 'PUT /api/leaves/:id',
                'delete': 'DELETE /api/leaves/:id',
                'approve': 'PATCH /api/leaves/:id/approve',
                'reject': 'PATCH /api/leaves/:id/reject'
            }
        }
    })

# Health check route
@app.route('/api/health')
def health():
    try:
        # Test database connection
        from sqlalchemy import text
        db.session.execute(text('SELECT 1'))
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'message': 'All systems operational'
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e)
        }), 500

# Before request hook to guarantee tables exist on serverless cold start
@app.before_request
def ensure_database_initialized():
    if not getattr(app, '_db_tables_ready', False):
        try:
            from models.user import User
            from models.leave import Leave
            db.create_all()
            app._db_tables_ready = True
        except Exception as e:
            print(f'[DB Init Error] {e}')

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': f'Internal server error: {str(error)}'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
