from datetime import datetime
from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('faculty', 'coordinator', 'chief_coordinator', 'principal', 'management'), 
                     default='faculty', nullable=False)
    department = db.Column(db.String(100))
    employee_id = db.Column(db.String(50), unique=True)
    phone_number = db.Column(db.String(20))
    profile_image = db.Column(db.Text)  # Changed to Text for large base64 images
    qualification = db.Column(db.String(100))
    specialization = db.Column(db.String(100))
    gender = db.Column(db.String(20))
    joining_date = db.Column(db.Date)
    google_id = db.Column(db.String(100), unique=True)
    github_id = db.Column(db.String(100), unique=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    leaves = db.relationship('Leave', back_populates='user', foreign_keys='Leave.user_id', lazy=True)
    approved_leaves = db.relationship('Leave', back_populates='approver', foreign_keys='Leave.approved_by', lazy=True)
    
    def set_password(self, password):
        """Hash and set password using werkzeug security"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if password matches using werkzeug security"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self, include_password=False):
        """Convert user to dictionary"""
        data = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'department': self.department,
            'employeeId': self.employee_id,
            'phoneNumber': self.phone_number,
            'profileImage': self.profile_image,
            'qualification': self.qualification,
            'specialization': self.specialization,
            'gender': self.gender,
            'joiningDate': self.joining_date.isoformat() if self.joining_date else None,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_password:
            data['password'] = self.password_hash
        return data
    
    def __repr__(self):
        return f'<User {self.email}>'
