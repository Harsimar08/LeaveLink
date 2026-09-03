from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from datetime import timedelta
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

# Load environment variables
load_dotenv()

# Import extensions
from extensions import db, jwt


def get_sqlite_database_uri():
    base_dir = '/tmp' if os.getenv('VERCEL') else os.path.dirname(__file__)
    return f'sqlite:///{os.path.join(base_dir, "leavelink.db")}'


def normalize_database_url(raw_db_url):
    parsed_url = raw_db_url
    if parsed_url.startswith('postgres://'):
        parsed_url = 'postgresql+pg8000://' + parsed_url[11:]
    elif parsed_url.startswith('postgresql://') and not parsed_url.startswith('postgresql+'):
        parsed_url = 'postgresql+pg8000://' + parsed_url[13:]
    elif parsed_url.startswith('mysql://'):
        parsed_url = 'mysql+pymysql://' + parsed_url[8:]

    if ('postgres' in parsed_url or 'pg8000' in parsed_url) and 'sslmode=' not in parsed_url:
        delimiter = '&' if '?' in parsed_url else '?'
        parsed_url = f'{parsed_url}{delimiter}sslmode=require'

    return parsed_url


def resolve_database_uri():
    fallback_uri = get_sqlite_database_uri()
    raw_db_url = os.getenv('DATABASE_URL', '').strip().strip("'").strip('"')

    if not raw_db_url or ("localhost" in raw_db_url and os.getenv('VERCEL')):
        return fallback_uri

    candidate = normalize_database_url(raw_db_url)
    engine_options = {
        'pool_pre_ping': True,
        'pool_recycle': 280,
    }

    if os.getenv('VERCEL'):
        engine_options['poolclass'] = NullPool

    if 'mysql' in candidate:
        engine_options['connect_args'] = {
            'connect_timeout': 10,
            'read_timeout': 30,
            'write_timeout': 30,
        }
    elif 'pg8000' in candidate:
        engine_options['connect_args'] = {'timeout': 10}

    try:
        engine = create_engine(candidate, **engine_options)
        with engine.connect() as connection:
            connection.execute(text('SELECT 1'))
        return candidate
    except Exception as exc:
        print(f'[DB] Configured database is unreachable ({candidate}). Falling back to SQLite. Error: {exc}')
        return fallback_uri


# Initialize Flask app
app = Flask(__name__)

# Disable strict slashes to prevent 308 redirects that break CORS
app.url_map.strict_slashes = False

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
app.config['SQLALCHEMY_DATABASE_URI'] = resolve_database_uri()

engine_options = {
    'pool_pre_ping': True,
    'pool_recycle': 280,
}

if os.getenv('VERCEL'):
    engine_options['poolclass'] = NullPool

if 'mysql' in app.config['SQLALCHEMY_DATABASE_URI']:
    engine_options['connect_args'] = {
        'connect_timeout': 10,
        'read_timeout': 30,
        'write_timeout': 30
    }
elif 'pg8000' in app.config['SQLALCHEMY_DATABASE_URI']:
    engine_options['connect_args'] = {'timeout': 10}

app.config['SQLALCHEMY_ENGINE_OPTIONS'] = engine_options
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

# Initialize extensions ONCE with guaranteed valid SQLALCHEMY_DATABASE_URI
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
from routes.holidays import holidays_bp

# Register blueprints for both /api/* and /* to handle any Vercel serverless path stripping
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(leaves_bp, url_prefix='/api/leaves')
app.register_blueprint(holidays_bp, url_prefix='/api/holidays')

app.register_blueprint(auth_bp, url_prefix='/auth', name='auth_direct')
app.register_blueprint(users_bp, url_prefix='/users', name='users_direct')
app.register_blueprint(leaves_bp, url_prefix='/leaves', name='leaves_direct')
app.register_blueprint(holidays_bp, url_prefix='/holidays', name='holidays_direct')

# Initialize optional OAuth
try:
    from routes.oauth import oauth_bp, init_oauth
    init_oauth(app)
    app.register_blueprint(oauth_bp, url_prefix='/api/auth')
except Exception as oauth_err:
    print(f'[OAuth Init Warning] {oauth_err}')

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
            print('[DB] Database tables initialized successfully')
        except Exception as e:
            db.session.rollback()
            db.session.remove()
            print(f'[DB Init Warning] {e}')

@app.teardown_appcontext
def shutdown_session(exception=None):
    db.session.remove()

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
