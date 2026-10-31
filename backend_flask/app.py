from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import timedelta
import os
import ssl
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

# Load environment variables
load_dotenv()

# Import extensions
from extensions import db, jwt

IS_VERCEL = bool(os.getenv('VERCEL'))

# Checked in order; Vercel's Neon/Supabase/Postgres integrations inject these names
DATABASE_URL_ENV_KEYS = ('DATABASE_URL', 'POSTGRES_URL', 'MYSQL_URL')
LOCAL_DB_HOSTS = ('localhost', '127.0.0.1', '::1')


def get_sqlite_database_uri():
    base_dir = '/tmp' if IS_VERCEL else os.path.dirname(__file__)
    return f'sqlite:///{os.path.join(base_dir, "leavelink.db")}'


def get_configured_database_url():
    for key in DATABASE_URL_ENV_KEYS:
        value = os.getenv(key, '').strip().strip("'").strip('"')
        if value:
            return value
    return ''


def build_database_config(raw_db_url):
    """Return (sqlalchemy_uri, engine_options) for a cloud/local Postgres or MySQL URL."""
    if raw_db_url.startswith('postgres://'):
        raw_db_url = 'postgresql://' + raw_db_url[len('postgres://'):]

    url = make_url(raw_db_url)
    backend = url.get_backend_name()
    engine_options = {
        'pool_pre_ping': True,
        'pool_recycle': 280,
    }
    if IS_VERCEL:
        engine_options['poolclass'] = NullPool

    if backend == 'postgresql':
        # pg8000 rejects libpq query params such as sslmode/channel_binding,
        # so translate sslmode into an ssl_context and drop the rest.
        sslmode = url.query.get('sslmode')
        if isinstance(sslmode, tuple):
            sslmode = sslmode[-1]
        if not sslmode:
            sslmode = 'disable' if url.host in LOCAL_DB_HOSTS else 'require'

        connect_args = {'timeout': 10}
        if sslmode != 'disable':
            ssl_context = ssl.create_default_context()
            if sslmode not in ('verify-ca', 'verify-full'):
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
            connect_args['ssl_context'] = ssl_context

        url = url.set(drivername='postgresql+pg8000', query={})
        engine_options['connect_args'] = connect_args
    elif backend == 'mysql':
        url = url.set(drivername='mysql+pymysql')
        engine_options['connect_args'] = {
            'connect_timeout': 10,
            'read_timeout': 30,
            'write_timeout': 30,
        }

    return url.render_as_string(hide_password=False), engine_options


def resolve_database_config():
    raw_db_url = get_configured_database_url()

    if raw_db_url:
        uri, engine_options = build_database_config(raw_db_url)
        if IS_VERCEL:
            if make_url(uri).host in LOCAL_DB_HOSTS:
                print('[DB] ⚠️  DATABASE_URL points at localhost, which does not exist on Vercel. Ignoring it.')
            else:
                # Never fall back to per-instance SQLite on Vercel: instances would each get
                # their own database and users/IDs would no longer match across requests.
                return uri, engine_options
        else:
            try:
                engine = create_engine(uri, **engine_options)
                with engine.connect() as connection:
                    connection.execute(text('SELECT 1'))
                engine.dispose()
            except Exception as exc:
                safe_uri = make_url(uri).render_as_string(hide_password=True)
                print(f'[DB] Configured database is unreachable ({safe_uri}). Falling back to local SQLite. Error: {exc}')
            else:
                print('[DB] Connected to configured database successfully')
                return uri, engine_options

    if IS_VERCEL:
        print('[DB] ⚠️  WARNING: No cloud DATABASE_URL configured on Vercel!')
        print('[DB] ⚠️  SQLite on Vercel is per-instance and ephemeral — accounts and leaves will NOT be shared between devices.')
        print('[DB] ⚠️  Set DATABASE_URL in Vercel Environment Variables to a cloud PostgreSQL/MySQL.')

    return get_sqlite_database_uri(), {'pool_pre_ping': True}


# Initialize Flask app
app = Flask(__name__)

# Disable strict slashes to prevent 308 redirects that break CORS
app.url_map.strict_slashes = False

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
database_uri, engine_options = resolve_database_config()
app.config['SQLALCHEMY_DATABASE_URI'] = database_uri
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = engine_options
app.config['DATABASE_BACKEND'] = make_url(database_uri).get_backend_name()
app.config['DATABASE_IS_SHARED'] = not (IS_VERCEL and app.config['DATABASE_BACKEND'] == 'sqlite')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'jwt-secret-key-change-this')
# Sessions end after 15 idle minutes; the frontend renews the token while the user is active
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=15)

if IS_VERCEL and not os.getenv('JWT_SECRET'):
    print('[AUTH] ⚠️  JWT_SECRET is not set on Vercel; tokens are signed with the public default key.')

# Vercel rejects request bodies above 4.5 MB
app.config['MAX_CONTENT_LENGTH'] = 4 * 1024 * 1024

# Upload configuration (legacy local uploads; new uploads are stored in the database)
base_upload_dir = '/tmp/uploads' if IS_VERCEL else os.path.join(os.path.dirname(__file__), 'uploads')
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
        'error': error_string,
        'authError': True
    }), 422

@jwt.unauthorized_loader
def unauthorized_callback(error_string):
    return jsonify({
        'success': False,
        'message': 'Missing authorization header',
        'error': error_string,
        'authError': True
    }), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'success': False,
        'message': 'Token has expired',
        'authError': True
    }), 401

@jwt.token_verification_loader
def verify_token_matches_user(jwt_header, jwt_data):
    """Reject tokens whose user no longer matches the database row with that id."""
    from models.user import User
    try:
        user_id = int(jwt_data.get('sub'))
    except (TypeError, ValueError):
        return False
    user = db.session.get(User, user_id)
    return bool(
        user
        and user.is_active
        and user.email == jwt_data.get('email')
        and user.role == jwt_data.get('role')
    )

@jwt.token_verification_failed_loader
def token_verification_failed_callback(jwt_header, jwt_data):
    return jsonify({
        'success': False,
        'message': 'Your session is no longer valid. Please log in again.',
        'authError': True
    }), 401

@app.after_request
def disable_api_caching(response):
    # Responses depend on the Authorization header, so they must never be
    # served from a browser/CDN cache to a different user or session.
    if not request.path.startswith(('/api/files/', '/files/', '/uploads/')):
        response.headers['Cache-Control'] = 'no-store'
        response.headers.add('Vary', 'Authorization')
    return response

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
from routes.files import files_bp

# Register blueprints for both /api/* and /* to handle any Vercel serverless path stripping
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(leaves_bp, url_prefix='/api/leaves')
app.register_blueprint(holidays_bp, url_prefix='/api/holidays')
app.register_blueprint(files_bp, url_prefix='/api/files')

app.register_blueprint(auth_bp, url_prefix='/auth', name='auth_direct')
app.register_blueprint(users_bp, url_prefix='/users', name='users_direct')
app.register_blueprint(leaves_bp, url_prefix='/leaves', name='leaves_direct')
app.register_blueprint(holidays_bp, url_prefix='/holidays', name='holidays_direct')
app.register_blueprint(files_bp, url_prefix='/files', name='files_direct')

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
        'database': app.config['DATABASE_BACKEND'],
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
        'database': app.config['DATABASE_BACKEND'],
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
    backend = app.config['DATABASE_BACKEND']
    shared = app.config['DATABASE_IS_SHARED']
    try:
        # Test database connection
        db.session.execute(text('SELECT 1'))
        payload = {
            'status': 'healthy' if shared else 'degraded',
            'database': 'connected',
            'databaseBackend': backend,
            'sharedDatabase': shared,
            'message': 'All systems operational'
        }
        if not shared:
            payload['message'] = ('No cloud DATABASE_URL is configured. Each server instance is using its own '
                                  'temporary SQLite file, so data is not shared between devices.')
        return jsonify(payload)
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'databaseBackend': backend,
            'sharedDatabase': shared,
            'error': str(e)
        }), 500

def migrate_leave_half_day_columns():
    """create_all() never alters existing tables, so older databases need these columns upgraded and old half-day rows repaired."""
    columns = {col['name']: col for col in inspect(db.engine).get_columns('leaves')}
    dialect = db.engine.dialect.name
    statements = []

    if 'is_half_day' not in columns:
        statements.append('ALTER TABLE leaves ADD COLUMN is_half_day BOOLEAN NOT NULL DEFAULT FALSE')
    for name in ('od_start_time', 'od_end_time'):
        if name not in columns:
            statements.append(f'ALTER TABLE leaves ADD COLUMN {name} VARCHAR(5)')

    days_type = str(columns.get('number_of_days', {}).get('type', '')).upper()
    if 'INT' in days_type:
        if dialect == 'postgresql':
            statements.append('ALTER TABLE leaves ALTER COLUMN number_of_days TYPE DOUBLE PRECISION')
        elif dialect == 'mysql':
            statements.append('ALTER TABLE leaves MODIFY number_of_days DOUBLE NOT NULL')

    if statements:
        with db.engine.begin() as conn:
            for statement in statements:
                conn.execute(text(statement))
        print(f'[DB] Migrated leaves table: {len(statements)} change(s)')

    # The old code stored half-day requests as int(0.5) == 0, so a 0-day leave is always a half-day
    from models.leave import Leave
    fixed = Leave.query.filter(Leave.number_of_days == 0).update(
        {Leave.number_of_days: 0.5, Leave.is_half_day: True, Leave.end_date: Leave.start_date},
        synchronize_session=False
    )
    db.session.commit()
    if fixed:
        print(f'[DB] Restored {fixed} half-day leave(s) saved as 0 days')

# Before request hook to guarantee tables exist on serverless cold start
@app.before_request
def ensure_database_initialized():
    if not getattr(app, '_db_tables_ready', False):
        try:
            from models.user import User
            from models.leave import Leave
            from models.stored_file import StoredFile
            db.create_all()
            migrate_leave_half_day_columns()
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

@app.before_request
def reject_oversized_uploads():
    if request.content_length and request.content_length > app.config['MAX_CONTENT_LENGTH']:
        return file_too_large(None)

@app.errorhandler(413)
def file_too_large(error):
    return jsonify({'success': False, 'message': 'File is too large. Maximum upload size is 4 MB.'}), 413

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': f'Internal server error: {str(error)}'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
