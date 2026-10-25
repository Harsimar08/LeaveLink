from datetime import datetime, timedelta, timezone
import hashlib
import re

import jwt as pyjwt
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from extensions import db
from utils.jwt_helpers import create_user_token
from utils.notifications import notify_password_reset
from sqlalchemy.exc import IntegrityError

auth_bp = Blueprint('auth', __name__)

RESET_MINUTES = 30
RESET_PURPOSE = 'password_reset'


def _reset_key():
    # Separate from the login-token key, so a reset link can never be used as a session token
    return current_app.config['JWT_SECRET_KEY'] + ':password-reset'


def _password_fingerprint(user):
    # Changes whenever the password changes, which makes each reset link single-use
    return hashlib.sha256(user.password_hash.encode()).hexdigest()[:24]


def create_reset_token(user):
    now = datetime.now(timezone.utc)
    payload = {
        'sub': str(user.id),
        'purpose': RESET_PURPOSE,
        'pwd': _password_fingerprint(user),
        'iat': now,
        'exp': now + timedelta(minutes=RESET_MINUTES),
    }
    return pyjwt.encode(payload, _reset_key(), algorithm='HS256')


def user_from_reset_token(token):
    """Returns the user for a valid, unused, unexpired reset token, otherwise None."""
    try:
        payload = pyjwt.decode(token, _reset_key(), algorithms=['HS256'])
    except pyjwt.PyJWTError:
        return None
    if payload.get('purpose') != RESET_PURPOSE:
        return None
    user = safe_db_exec(lambda: User.query.get(int(payload.get('sub', 0))))
    if not user or user.is_active is False or payload.get('pwd') != _password_fingerprint(user):
        return None
    return user

def validate_email(email):
    """Validate email format"""
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

def safe_db_exec(func, prepare_fn=None):
    try:
        return func()
    except Exception as e:
        db.session.rollback()
        err_msg = str(e)
        if any(kw in err_msg for kw in ['2013', '2006', 'Lost connection', 'OperationalError', 'InterfaceError', 'closed', 'socket', 'gone away']):
            print(f'[Transient DB Drop] {err_msg}. Auto-retrying with fresh connection...')
            try:
                db.session.remove()
                if prepare_fn:
                    prepare_fn()
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
        
        # Clean employee_id and department
        raw_emp_id = (data.get('employeeId') or '').strip()
        raw_dept = (data.get('department') or '').strip()
        
        # Create new user
        user = User(
            name=data['name'].strip(),
            email=data['email'].lower().strip(),
            role=data['role'],
            department=raw_dept if raw_dept else ('Administration' if data['role'] in ['principal', 'management'] else 'General'),
            employee_id=raw_emp_id if raw_emp_id else None,
            phone_number=data.get('phoneNumber', '').strip() if data.get('phoneNumber') else None
        )
        user.set_password(data['password'])
        
        try:
            db.session.add(user)
            safe_db_exec(
                func=lambda: db.session.commit(),
                prepare_fn=lambda: db.session.merge(user)
            )
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
        
        access_token = create_user_token(user)
        
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
        if any(kw in error_str for kw in ['2013', '2006', 'Lost connection', 'OperationalError', 'InterfaceError', 'closed', 'socket', 'gone away']):
            return jsonify({
                'success': False,
                'message': 'Database connection lost. The cloud database host is unreachable or dropped connection. Please check database settings or redeploy.'
            }), 500
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
        
        access_token = create_user_token(user)
        
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
        
        user = safe_db_exec(lambda: User.query.get(user_id))
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

# @route   POST /api/auth/refresh
# @desc    Issue a fresh token so an active session doesn't hit the idle timeout
# @access  Private
@auth_bp.route('/refresh', methods=['POST'])
@jwt_required()
def refresh_token():
    user = safe_db_exec(lambda: User.query.get(int(get_jwt_identity())))
    if not user:
        return jsonify({'success': False, 'message': 'User not found', 'authError': True}), 401
    return jsonify({'success': True, 'token': create_user_token(user)}), 200

# @route   POST /api/auth/forgot-password
# @desc    Email a password reset link (same reply whether or not the account exists)
# @access  Public
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    if not email or not validate_email(email):
        return jsonify({'success': False, 'message': 'Enter a valid email address.'}), 400

    reply = jsonify({
        'success': True,
        'message': f'If an account exists for {email}, a password reset link has been sent to it. '
                   f'The link expires in {RESET_MINUTES} minutes.',
    })
    try:
        user = safe_db_exec(lambda: User.query.filter_by(email=email).first())
        if user and user.is_active is not False:
            notify_password_reset(user, create_reset_token(user), RESET_MINUTES)
            print(f'[AUTH] Password reset requested for user ID {user.id}')
    except Exception as e:
        db.session.rollback()
        print(f'Forgot password error: {e}')
        return jsonify({'success': False, 'message': 'Could not send the reset email. Please try again.'}), 500
    return reply, 200


# @route   POST /api/auth/reset-password/verify
# @desc    Check a reset link before showing the new-password form
# @access  Public
@auth_bp.route('/reset-password/verify', methods=['POST'])
def verify_reset_token():
    data = request.get_json(silent=True) or {}
    user = user_from_reset_token(data.get('token') or '')
    if not user:
        return jsonify({'success': False, 'message': 'This reset link is invalid, has expired, or was already used.'}), 400
    return jsonify({'success': True, 'email': user.email}), 200


# @route   POST /api/auth/reset-password
# @desc    Set a new password using a reset link
# @access  Public
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json(silent=True) or {}
    password = data.get('password') or ''
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400

    user = user_from_reset_token(data.get('token') or '')
    if not user:
        return jsonify({'success': False, 'message': 'This reset link is invalid, has expired, or was already used.'}), 400
    try:
        user.set_password(password)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f'Reset password error: {e}')
        return jsonify({'success': False, 'message': 'Could not update the password. Please try again.'}), 500
    print(f'[AUTH] Password reset completed for user ID {user.id}')
    return jsonify({'success': True, 'message': 'Your password has been changed. You can now sign in.', 'role': user.role}), 200


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
