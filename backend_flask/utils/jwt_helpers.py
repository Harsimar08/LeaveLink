"""
JWT Helper Functions
Centralized functions to extract user information from JWT tokens
"""
from flask_jwt_extended import get_jwt_identity, get_jwt

def get_current_user_id():
    """Get the current user's ID from JWT token"""
    return int(get_jwt_identity())

def get_current_user_role():
    """Get the current user's role from JWT claims"""
    claims = get_jwt()
    return claims.get('role')

def get_current_user_info():
    """Get both user ID and role"""
    return {
        'userId': get_current_user_id(),
        'role': get_current_user_role()
    }
