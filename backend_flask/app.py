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

try:
    raw_db_url = os.getenv('DATABASE_URL', '')
    db_url = raw_db_url.strip().strip("'").strip('"')

    # On serverless (Vercel) or when DATABASE_URL is not set / points to unreachable localhost MySQL, use SQLite for zero-config reliability
    if not db_url or ('localhost' in db_url and os.getenv('VERCEL')):
        base_dir = '/tmp' if os.getenv('VERCEL') else os.path.dirname(__file__)
        db_path = os.path.join(base_dir, 'leavelink.db')
        db_url = f'sqlite:///{db_path}'
    elif db_url.startswith('postgres://') or db_url.startswith('postgresql://'):
        if db_url.startswith('postgres://'):
            db_url = 'postgresql+pg8000://' + db_url[11:]
        elif db_url.startswith('postgresql://') and not db_url.startswith('postgresql+'):
            db_url = 'postgresql+pg8000://' + db_url[13:]

        if 'sslmode=' not in db_url:
            delimiter = '&' if '?' in db_url else '?'
            db_url = f'{db_url}{delimiter}sslmode=require'

    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    db.init_app(app)
except Exception as db_init_err:
    print(f'[DB Config Exception] {db_init_err}. Falling back to SQLite.')
    base_dir = '/tmp' if os.getenv('VERCEL') else os.path.dirname(__file__)
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(base_dir, "leavelink.db")}'
    try:
        db.init_app(app)
    except Exception:
        pass

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

# Before request hook to guarantee tables exist on serverless cold start with automatic failover
@app.before_request
def ensure_database_initialized():
    if not getattr(app, '_db_tables_ready', False):
        try:
            from models.user import User
            from models.leave import Leave
            db.create_all()
            app._db_tables_ready = True
            print('[DB] Primary database initialized successfully')
        except Exception as e:
            print(f'[DB Init Error] Primary DB failed: {e}. Switching to failover database...')
            try:
                base_dir = '/tmp' if os.getenv('VERCEL') else os.path.dirname(__file__)
                sqlite_url = f'sqlite:///{os.path.join(base_dir, "leavelink.db")}'
                app.config['SQLALCHEMY_DATABASE_URI'] = sqlite_url
                db.engine.dispose()
                from models.user import User
                from models.leave import Leave
                db.create_all()
                app._db_tables_ready = True
                print('[DB Failover] SQLite failover database ready!')
            except Exception as fe:
                print(f'[DB Failover Error] {fe}')

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
