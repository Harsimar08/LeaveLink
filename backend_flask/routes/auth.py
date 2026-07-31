from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models.user import User
from extensions import db
from sqlalchemy.exc import IntegrityError
import re

auth_bp = Blueprint('auth', __name__)

def validate_email(email):
    """Validate email format"""
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

def safe_db_exec(func):
    try:
        return func()
    except Exception as e:
        db.session.rollback()
        err_msg = str(e)
        if any(kw in err_msg for kw in ['2013', 'Lost connection', 'OperationalError', 'InterfaceError', 'closed']):
            print(f'[Transient DB Drop] {err_msg}. Auto-retrying with fresh connection...')
            try:
                db.session.remove()
                return func()
            except Exception as retry_err:
                db.session.rollback()
                raise retry_err
        raise e

# @route   POST /api/auth/register
# @desc    Register a new user
# @access  Public
@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if data is None:
            return jsonify({
                'success': False,
                'message': 'Invalid request body. Send JSON with name, email, password, role.'
            }), 400
        
        # Validate required fields
        required_fields = ['name', 'email', 'password', 'role']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'{field.capitalize()} is required'
                }), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400
        
        # Validate password length
        if len(data['password']) < 6:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 6 characters'
            }), 400
        
        # Validate role
        valid_roles = ['faculty', 'coordinator', 'chief_coordinator', 'principal', 'management']
        if data['role'] not in valid_roles:
            return jsonify({
                'success': False,
                'message': 'Invalid role'
            }), 400
        
        # Check if user already exists
        existing_user = safe_db_exec(lambda: User.query.filter_by(email=data['email'].lower()).first())
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'User with this email already exists'
            }), 400
        
        # Create new user
        user = User(
            name=data['name'].strip(),
            email=data['email'].lower().strip(),
            role=data['role'],
            department=data.get('department', '').strip() if data.get('department') else None,
            employee_id=data.get('employeeId', '').strip() if data.get('employeeId') else None,
            phone_number=data.get('phoneNumber', '').strip() if data.get('phoneNumber') else None
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        try:
            safe_db_exec(lambda: db.session.commit())
        except IntegrityError as ie:
            db.session.rollback()
            # Determine if it's a duplicate employee_id or other unique constraint
            msg = str(ie.orig) if hasattr(ie, 'orig') else str(ie)
            print(f'Registration integrity error: {msg}')
            return jsonify({
                'success': False,
                'message': 'Registration failed due to duplicate or invalid data (email or employee ID).',
                'error': msg
            }), 400
        
        # Generate JWT token with user ID as string (Flask-JWT-Extended requirement)
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'role': user.role}
        )
        
        print(f'[AUTH] User registered: {user.email} (ID: {user.id}, Role: {user.role})')
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'token': access_token,
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        error_str = str(e)
        return jsonify({
            'success': False,
            'message': f'Server error during registration: {error_str}'
        }), 500

# @route   POST /api/auth/login
# @desc    Login user
# @access  Public
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if data is None:
            return jsonify({
                'success': False,
                'message': 'Invalid request body. Send JSON with email, password, role.'
            }), 400
        
        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        if not data.get('role'):
            return jsonify({
                'success': False,
                'message': 'Role is required'
            }), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        role = data['role']
        
        print(f'Login attempt: {email}, {role}')
        
        # Find user by email
        user = safe_db_exec(lambda: User.query.filter_by(email=email).first())
        if not user:
            print(f'User not found: {email}')
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        # Check if role matches
        if user.role != role:
            print(f'Role mismatch: expected {user.role}, got {role}')
            return jsonify({
                'success': False,
                'message': f'Invalid credentials for {role} role'
            }), 401
        
        # Verify password
        if not user.check_password(password):
            print('Invalid password')
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        # Check if user is active
        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Account is deactivated'
            }), 401
        
        # Generate JWT token with user ID as string (Flask-JWT-Extended requirement)
        # We'll include additional data in the token claims
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'role': user.role}
        )
        
        print(f'[AUTH] Login successful: {user.email}')
        print(f'Generated token for user ID: {user.id}, role: {user.role}')
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        print(f'Login error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error during login',
            'error': str(e)
        }), 500

# @route   GET /api/auth/me
# @desc    Get current user
# @access  Private
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        # Get user ID from JWT identity (it's a string)
        user_id = int(get_jwt_identity())
        print(f'Fetching user with ID: {user_id}')  # Debug log
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        print(f'Get current user error: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500

# @route   POST /api/auth/change-password
# @desc    Change user password
# @access  Private
@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        # Get user ID from JWT identity (it's a string)
        user_id = int(get_jwt_identity())
        data = request.get_json()
        if data is None:
            return jsonify({
                'success': False,
                'message': 'Invalid request body. Send JSON with currentPassword and newPassword.'
            }), 400
        
        if not data.get('currentPassword') or not data.get('newPassword'):
            return jsonify({
                'success': False,
                'message': 'Current password and new password are required'
            }), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Verify current password
        if not user.check_password(data['currentPassword']):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 401
        
        # Validate new password length
        if len(data['newPassword']) < 6:
            return jsonify({
                'success': False,
                'message': 'New password must be at least 6 characters'
            }), 400
        
        # Update password
        user.set_password(data['newPassword'])
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f'Change password error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500
