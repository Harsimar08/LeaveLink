"""
JWT Helper Functions
Centralized functions to create tokens and extract user information from them
"""
from flask_jwt_extended import create_access_token, get_jwt_identity, get_jwt


def create_user_token(user):
    """Create an access token bound to this exact user (id + email + role).

    The email/role claims are re-checked against the database on every request,
    so a token can never resolve to a different account that happens to share
    the same numeric id.
    """
    return create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'email': user.email}
    )

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
