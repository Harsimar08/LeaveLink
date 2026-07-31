from datetime import datetime
from extensions import db

class Leave(db.Model):
    __tablename__ = 'leaves'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    leave_type = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    number_of_days = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default='Pending', nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    approver_name = db.Column(db.String(100))
    action_date = db.Column(db.DateTime)
    rejection_reason = db.Column(db.Text)
    attachment = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='leaves', foreign_keys=[user_id])
    approver = db.relationship('User', back_populates='approved_leaves', foreign_keys=[approved_by])
    
    def to_dict(self, include_user=True):
        """Convert leave to dictionary"""
        data = {
            'id': self.id,
            'userId': self.user_id,
            'leaveType': self.leave_type,
            'startDate': self.start_date.isoformat() if self.start_date else None,
            'endDate': self.end_date.isoformat() if self.end_date else None,
            'numberOfDays': self.number_of_days,
            'reason': self.reason,
            'status': self.status,
            'approvedBy': self.approved_by,
            'approverName': self.approver_name,
            'actionDate': self.action_date.isoformat() if self.action_date else None,
            'rejectionReason': self.rejection_reason,
            'attachment': self.attachment,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_user and self.user:
            data['user'] = {
                'id': self.user.id,
                'name': self.user.name,
                'email': self.user.email,
                'role': self.user.role,
                'department': self.user.department
            }
        
        if self.approver:
            data['approver'] = {
                'id': self.approver.id,
                'name': self.approver.name
            }
        
        return data
    
    def __repr__(self):
        return f'<Leave {self.id} - {self.leave_type}>'
