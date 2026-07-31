from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models.user import User
from extensions import db

users_bp = Blueprint('users', __name__)

# @route   GET /api/users
# @desc    Get all users (coordinators and above only)
# @access  Private
@users_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_users():
    try:
        # Get user ID and role from JWT
        user_id = int(get_jwt_identity())
        claims = get_jwt()
        user_role = claims.get('role')
        
        # Only coordinators and above can view all users
        if user_role not in ['coordinator', 'chief_coordinator', 'principal']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        users = User.query.all()
        
        return jsonify({
            'success': True,
            'count': len(users),
            'users': [user.to_dict() for user in users]
        }), 200
        
    except Exception as e:
        print(f'Get all users error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500

# @route   GET /api/users/:id
# @desc    Get user by ID
# @access  Private
@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_by_id(user_id):
    try:
        # Get user ID and role from JWT
        current_user_id = int(get_jwt_identity())
        claims = get_jwt()
        user_role = claims.get('role')
        
        # Users can view their own profile or coordinators can view any profile
        if current_user_id != user_id and user_role not in ['coordinator', 'chief_coordinator', 'principal']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
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
        print(f'Get user by ID error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500

# @route   PUT /api/users/:id
# @desc    Update user
# @access  Private
@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    try:
        # Get user ID and role from JWT
        current_user_id = int(get_jwt_identity())
        claims = get_jwt()
        user_role = claims.get('role')
        
        # Users can update their own profile or admins can update any profile
        if current_user_id != user_id and user_role not in ['chief_coordinator', 'principal']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'name' in data:
            user.name = data['name'].strip()
        if 'department' in data:
            user.department = data['department'].strip() if data['department'] else None
        if 'phoneNumber' in data:
            user.phone_number = data['phoneNumber'].strip() if data['phoneNumber'] else None
        if 'employeeId' in data:
            user.employee_id = data['employeeId'].strip() if data['employeeId'] else None
        if 'profileImage' in data:
            user.profile_image = data['profileImage']
        if 'qualification' in data:
            user.qualification = data['qualification'].strip() if data['qualification'] else None
        if 'specialization' in data:
            user.specialization = data['specialization'].strip() if data['specialization'] else None
        if 'gender' in data:
            user.gender = data['gender'].strip() if data['gender'] else None
        if 'joiningDate' in data:
            user.joining_date = data['joiningDate'] if data['joiningDate'] else None
        
        # Only admins can change role and status
        if user_role in ['chief_coordinator', 'principal']:
            if 'role' in data:
                user.role = data['role']
            if 'isActive' in data:
                user.is_active = data['isActive']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f'Update user error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500

# @route   DELETE /api/users/:id
# @desc    Delete user (soft delete - deactivate)
# @access  Private (admin only)
@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    try:
        # Get user role from JWT claims
        claims = get_jwt()
        user_role = claims.get('role')
        
        # Only admins can delete users
        if user_role not in ['chief_coordinator', 'principal']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Soft delete - deactivate user instead of deleting
        user.is_active = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'User deactivated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f'Delete user error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500
