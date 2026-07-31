from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from datetime import timedelta
import os
from dotenv import load_dotenv
from sqlalchemy import text

# Load environment variables
load_dotenv()

# Import extensions
from extensions import db, bcrypt, jwt

# Initialize Flask app
app = Flask(__name__)

# Disable strict slashes to prevent 308 redirects that break CORS
app.url_map.strict_slashes = False

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'mysql+pymysql://root@localhost:3306/techtimeoff')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'jwt-secret-key-change-this')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

# Upload configuration
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Session configuration for OAuth
app.config['SESSION_COOKIE_NAME'] = 'techtimeoff_session'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)

# Initialize extensions with app
db.init_app(app)
bcrypt.init_app(app)
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
allowed_origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://teachtimeoff.vercel.app',
    os.getenv('FRONTEND_URL')
]
allowed_origins = [origin for origin in allowed_origins if origin]

CORS(app, 
     origins=allowed_origins,
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

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(leaves_bp, url_prefix='/api/leaves')
app.register_blueprint(oauth_bp, url_prefix='/api/auth')
app.register_blueprint(holidays_bp, url_prefix='/api/holidays')

# Root route
@app.route('/')
def index():
    return jsonify({
        'message': '🚀 TechTimeOff API Server (Flask)',
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
        'message': '✅ TechTimeOff API is running',
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

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': 'Internal server error'}), 500

# Create tables
with app.app_context():
    try:
        # Import models here to avoid circular imports
        from models.user import User
        from models.leave import Leave
        
        db.create_all()
        print('[DB] Database tables created successfully')
    except Exception as e:
        print(f'[DB Warning] Database init deferred: {e}')

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
