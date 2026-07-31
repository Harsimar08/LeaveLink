import os
from flask import Blueprint, request, jsonify, current_app, url_for
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime
from werkzeug.utils import secure_filename
from models.leave import Leave
from models.user import User
from extensions import db

leaves_bp = Blueprint('leaves', __name__)

# @route   POST /api/leaves
# @desc    Create a new leave request
# @access  Private
@leaves_bp.route('/', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def create_leave():
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
    
    # Require authentication for actual POST request
    if not get_jwt_identity():
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    try:
        # Get user ID from JWT
        user_id = int(get_jwt_identity())
        
        if request.content_type and 'multipart/form-data' in request.content_type:
            data = request.form.to_dict()
            file = request.files.get('attachment')
        else:
            data = request.get_json() or {}
            file = None
        
        # Validate required fields
        required_fields = ['leaveType', 'startDate', 'endDate', 'numberOfDays', 'reason']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        # Parse dates
        try:
            start_date = datetime.strptime(data['startDate'], '%Y-%m-%d').date()
            end_date = datetime.strptime(data['endDate'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Invalid date format. Use YYYY-MM-DD'
            }), 400
        
        # Validate dates
        if end_date < start_date:
            return jsonify({
                'success': False,
                'message': 'End date must be after or equal to start date'
            }), 400
        
        attachment_url = None
        if file:
            filename = secure_filename(file.filename)
            save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(save_path)
            attachment_url = url_for('uploaded_file', filename=filename, _external=True)
        elif data.get('attachment'):
            attachment_url = data.get('attachment')
        
        # Create new leave
        leave = Leave(
            user_id=user_id,
            leave_type=data['leaveType'],
            start_date=start_date,
            end_date=end_date,
            number_of_days=data['numberOfDays'],
            reason=data['reason'].strip(),
            attachment=attachment_url
        )
        
        db.session.add(leave)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Leave request submitted successfully',
            'leave': leave.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f'Create leave error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500

# @route   GET /api/leaves
# @desc    Get all leave requests (filtered by role)
# @access  Private
@leaves_bp.route('/', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_all_leaves():
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
    
    # Require authentication for actual GET request
    if not get_jwt_identity():
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    try:
        # Get user ID and role from JWT
        user_id = int(get_jwt_identity())
        claims = get_jwt()
        user_role = claims.get('role')
        
        if user_role == 'faculty':
            # Faculty can only see their own leaves
            leaves = Leave.query.filter_by(user_id=user_id).order_by(Leave.created_at.desc()).all()
        else:
            # Coordinators and above can see all leaves
            leaves = Leave.query.order_by(Leave.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'count': len(leaves),
            'leaves': [leave.to_dict() for leave in leaves]
        }), 200
        
    except Exception as e:
        print(f'Get all leaves error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500

# @route   GET /api/leaves/:id
# @desc    Get leave by ID
# @access  Private
@leaves_bp.route('/<int:leave_id>', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_leave_by_id(leave_id):
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
    
    # Require authentication for actual GET request
    if not get_jwt_identity():
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    
    try:
        # Get user ID and role from JWT
        user_id = int(get_jwt_identity())
        claims = get_jwt()
        user_role = claims.get('role')
        
        leave = Leave.query.get(leave_id)
        if not leave:
            return jsonify({
                'success': False,
                'message': 'Leave request not found'
            }), 404
        
        # Faculty can only view their own leaves
        if user_role == 'faculty' and leave.user_id != user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        return jsonify({
            'success': True,
            'leave': leave.to_dict()
        }), 200
        
    except Exception as e:
        print(f'Get leave by ID error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500

# @route   PUT /api/leaves/:id
# @desc    Update leave request
# @access  Private
@leaves_bp.route('/<int:leave_id>', methods=['PUT', 'OPTIONS'])
@jwt_required(optional=True)
def update_leave(leave_id):
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
    
    # Require authentication for actual PUT request
    if not get_jwt_identity():
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    
    try:
        # Get user ID from JWT
        user_id = int(get_jwt_identity())
        
        leave = Leave.query.get(leave_id)
        if not leave:
            return jsonify({
                'success': False,
                'message': 'Leave request not found'
            }), 404
        
        # Only the user who created the leave can update it
        if leave.user_id != user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        # Can only update if status is Pending
        if leave.status != 'Pending':
            return jsonify({
                'success': False,
                'message': 'Cannot update leave request that is not pending'
            }), 400
        
        data = request.get_json()
        
        # Update allowed fields
        if 'leaveType' in data:
            leave.leave_type = data['leaveType']
        if 'reason' in data:
            leave.reason = data['reason'].strip()
        if 'attachment' in data:
            leave.attachment = data['attachment']
        
        if 'startDate' in data and 'endDate' in data:
            try:
                start_date = datetime.strptime(data['startDate'], '%Y-%m-%d').date()
                end_date = datetime.strptime(data['endDate'], '%Y-%m-%d').date()
                
                if end_date < start_date:
                    return jsonify({
                        'success': False,
                        'message': 'End date must be after or equal to start date'
                    }), 400
                
                leave.start_date = start_date
                leave.end_date = end_date
                
                if 'numberOfDays' in data:
                    leave.number_of_days = data['numberOfDays']
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid date format. Use YYYY-MM-DD'
                }), 400
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Leave request updated successfully',
            'leave': leave.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f'Update leave error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500

# @route   DELETE /api/leaves/:id
# @desc    Delete/Cancel leave request
# @access  Private
@leaves_bp.route('/<int:leave_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required(optional=True)
def delete_leave(leave_id):
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
    
    # Require authentication for actual DELETE request
    if not get_jwt_identity():
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    
    try:
        # Get user ID from JWT
        user_id = int(get_jwt_identity())
        
        leave = Leave.query.get(leave_id)
        if not leave:
            return jsonify({
                'success': False,
                'message': 'Leave request not found'
            }), 404
        
        # Only the user who created the leave can delete it
        if leave.user_id != user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        # Mark as cancelled instead of deleting
        leave.status = 'Cancelled'
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Leave request cancelled successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f'Delete leave error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500

# @route   PATCH /api/leaves/:id/approve
# @desc    Approve leave request
# @access  Private (coordinators and above)
@leaves_bp.route('/<int:leave_id>/approve', methods=['PATCH', 'OPTIONS'])
@jwt_required(optional=True)
def approve_leave(leave_id):
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
    
    # Require authentication for actual PATCH request
    if not get_jwt_identity():
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    
    try:
        # Get user ID and role from JWT
        user_id = int(get_jwt_identity())
        claims = get_jwt()
        user_role = claims.get('role')
        
        # Only coordinators and above can approve leaves
        if user_role not in ['coordinator', 'chief_coordinator', 'principal', 'management']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        leave = Leave.query.get(leave_id)
        if not leave:
            return jsonify({
                'success': False,
                'message': 'Leave request not found'
            }), 404
        
        if leave.status != 'Pending':
            return jsonify({
                'success': False,
                'message': 'Can only approve pending leave requests'
            }), 400
        
        # Get approver details
        approver = User.query.get(user_id)
        
        leave.status = 'Approved'
        leave.approved_by = user_id
        leave.approver_name = approver.name if approver else ''
        leave.action_date = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Leave request approved successfully',
            'leave': leave.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f'Approve leave error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500

# @route   PATCH /api/leaves/:id/reject
# @desc    Reject leave request
# @access  Private (coordinators and above)
@leaves_bp.route('/<int:leave_id>/reject', methods=['PATCH', 'OPTIONS'])
@jwt_required(optional=True)
def reject_leave(leave_id):
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
    
    # Require authentication for actual PATCH request
    if not get_jwt_identity():
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    
    try:
        # Get user ID and role from JWT
        user_id = int(get_jwt_identity())
        claims = get_jwt()
        user_role = claims.get('role')
        
        # Only coordinators and above can reject leaves
        if user_role not in ['coordinator', 'chief_coordinator', 'principal', 'management']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        leave = Leave.query.get(leave_id)
        if not leave:
            return jsonify({
                'success': False,
                'message': 'Leave request not found'
            }), 404
        
        if leave.status != 'Pending':
            return jsonify({
                'success': False,
                'message': 'Can only reject pending leave requests'
            }), 400
        
        data = request.get_json() or {}
        rejection_reason = data.get('rejectionReason', data.get('reason', ''))
        
        # Get approver details
        approver = User.query.get(user_id)
        
        leave.status = 'Rejected'
        leave.approved_by = user_id
        leave.approver_name = approver.name if approver else ''
        leave.action_date = datetime.utcnow()
        leave.rejection_reason = rejection_reason
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Leave request rejected successfully',
            'leave': leave.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f'Reject leave error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Server error',
            'error': str(e)
        }), 500
