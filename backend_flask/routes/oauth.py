"""
OAuth routes for Google and GitHub authentication
"""
from flask import Blueprint, request, jsonify, redirect, url_for, session
from flask_jwt_extended import create_access_token
from authlib.integrations.flask_client import OAuth
from urllib.parse import quote
from models.user import User
from extensions import db
import os
import secrets
from sqlalchemy.exc import IntegrityError

oauth_bp = Blueprint('oauth', __name__)

# Initialize OAuth
oauth = OAuth()

def init_oauth(app):
    """Initialize OAuth with app configuration"""
    oauth.init_app(app)
    # Register Google OAuth - redirect_uri must match Google Console exactly
    oauth.register(
        name='google',
        client_id=os.getenv('GOOGLE_CLIENT_ID'),
        client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={
            'scope': 'openid email profile'
        },
        # Do not set a fixed redirect_uri here; compute it at request time to
        # avoid mismatches between localhost/127.0.0.1 or different hosts.
    )

    return oauth

# @route   GET /api/auth/google
# @desc    Initiate Google OAuth login
# @access  Public
@oauth_bp.route('/google', methods=['GET'])
def google_login():
    """Redirect to Google OAuth consent screen"""
    try:
        # Check if Google OAuth is configured
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')

        if not client_id or not client_secret or client_id == 'your-google-client-id':
            msg = quote('Google Sign-In is not configured. Please use email and password to login.')
            return redirect(f"{frontend_url}/login?error=oauth_not_configured&message={msg}")

        # Store frontend URL in session for callback
        session['frontend_url'] = frontend_url

        # Compute redirect URI at request time so it matches the current host.
        redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')
        if redirect_uri:
            redirect_uri = redirect_uri.strip()
        else:
            # Builds an absolute URL to the callback using the request host
            redirect_uri = url_for('oauth.google_callback', _external=True)

        print(f'Google OAuth redirect_uri: {redirect_uri}')  # Ensure this exact URI is added in Google Console

        return oauth.google.authorize_redirect(redirect_uri)
        
    except Exception as e:
        print(f'Google login error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to initiate Google authentication',
            'error': str(e)
        }), 500

# @route   GET /api/auth/google/callback
# @desc    Google OAuth callback
# @access  Public
@oauth_bp.route('/google/callback', methods=['GET'])
def google_callback():
    """Handle Google OAuth callback"""
    try:
        # Get the OAuth token from Google (redirect_uri set in oauth.register)
        token = oauth.google.authorize_access_token()
        
        # Get user info from Google
        user_info = token.get('userinfo')
        
        if not user_info:
            # If userinfo is not in token, fetch it
            resp = oauth.google.get('https://www.googleapis.com/oauth2/v3/userinfo')
            user_info = resp.json()
        
        print(f'Google user info: {user_info}')
        
        # Extract user data
        google_id = user_info.get('sub')
        email = user_info.get('email')
        name = user_info.get('name')
        profile_image = user_info.get('picture')
        
        if not google_id or not email:
            return redirect(f"{session.get('frontend_url', 'http://localhost:5173')}/login?error=missing_user_info")
        
        # Check if user exists
        user = User.query.filter_by(email=email.lower()).first()
        
        if user:
            # User exists - update Google ID and profile image if not set
            if not user.google_id:
                user.google_id = google_id
            if not user.profile_image and profile_image:
                user.profile_image = profile_image
            try:
                db.session.commit()
            except IntegrityError as ie:
                db.session.rollback()
                print(f'Google signup integrity error: {ie}')
                return redirect(f"{session.get('frontend_url','http://localhost:5173')}/login?error=duplicate_data")
            print(f'[OAUTH] Google login successful for existing user: {email}')
        else:
            # New user - create account (Google signup)
            user = User(
                name=name or email.split('@')[0],
                email=email.lower(),
                google_id=google_id,
                profile_image=profile_image,
                role='faculty'
            )
            user.set_password(secrets.token_urlsafe(32))  # Random password (unused for Google users)
            db.session.add(user)
            db.session.commit()
            print(f'[OAUTH] Google signup successful for new user: {email}')
        
        # Generate JWT token
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'role': user.role}
        )
        
        # Get frontend URL from session
        frontend_url = session.get('frontend_url', 'http://localhost:5173')
        
        # Redirect to frontend with token
        redirect_url = f"{frontend_url}/auth/callback?token={access_token}"
        
        return redirect(redirect_url)
        
    except Exception as e:
        print(f'Google callback error: {str(e)}')
        import traceback
        traceback.print_exc()
        
        frontend_url = session.get('frontend_url', 'http://localhost:5173')
        return redirect(f"{frontend_url}/login?error={str(e)}")

# @route   POST /api/auth/google/signup
# @desc    Complete Google OAuth signup with role selection
# @access  Public
@oauth_bp.route('/google/signup', methods=['POST'])
def google_signup_complete():
    """
    Complete Google signup by allowing user to select role and add additional info.
    This is called from frontend after initial Google authentication.
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('email') or not data.get('role'):
            return jsonify({
                'success': False,
                'message': 'Email and role are required'
            }), 400
        
        email = data['email'].lower().strip()
        role = data['role']
        
        # Validate role
        valid_roles = ['faculty', 'coordinator', 'chief_coordinator', 'principal', 'management']
        if role not in valid_roles:
            return jsonify({
                'success': False,
                'message': 'Invalid role'
            }), 400
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found. Please sign in with Google first.'
            }), 404
        
        # Update user with additional information
        user.role = role
        
        if data.get('department'):
            user.department = data['department'].strip()
        if data.get('employeeId'):
            user.employee_id = data['employeeId'].strip()
        if data.get('phoneNumber'):
            user.phone_number = data['phoneNumber'].strip()
        
        try:
            db.session.commit()
        except IntegrityError as ie:
            db.session.rollback()
            print(f'Google signup complete integrity error: {ie}')
            return jsonify({
                'success': False,
                'message': 'Update failed due to duplicate or invalid data (employee ID or other).',
                'error': str(ie)
            }), 400
        
        # Generate new JWT token with updated role
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'role': user.role}
        )
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f'Google signup complete error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500
