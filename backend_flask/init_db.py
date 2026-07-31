"""
Database initialization and seed script
"""
from app import app
from extensions import db
from models.user import User
from models.leave import Leave
from datetime import datetime, timedelta

def init_database():
    """Initialize database and create tables"""
    with app.app_context():
        # Drop all tables (CAUTION: This will delete all data!)
        # db.drop_all()
        
        # Create all tables
        db.create_all()
        print('✅ Database tables created successfully')

def seed_users():
    """Seed database with sample users"""
    with app.app_context():
        # Check if users already exist
        if User.query.count() > 0:
            print('⚠️ Users already exist. Skipping seed.')
            return
        
        users_data = [
            {
                'name': 'Kritika Yadav',
                'email': 'kritika@jims.edu',
                'password': 'password123',
                'role': 'faculty',
                'department': 'Computer Applications',
                'employee_id': 'EMP001',
                'phone_number': '+91 999-999-9999'
            },
            {
                'name': 'Dr. Rajesh Kumar',
                'email': 'rajesh@jims.edu',
                'password': 'password123',
                'role': 'coordinator',
                'department': 'Computer Science',
                'employee_id': 'EMP002',
                'phone_number': '+91 888-888-8888'
            },
            {
                'name': 'Prof. Sunita Sharma',
                'email': 'sunita@jims.edu',
                'password': 'password123',
                'role': 'chief_coordinator',
                'department': 'Administration',
                'employee_id': 'EMP003',
                'phone_number': '+91 777-777-7777'
            },
            {
                'name': 'Dr. Amit Verma',
                'email': 'amit@jims.edu',
                'password': 'password123',
                'role': 'principal',
                'department': 'Administration',
                'employee_id': 'EMP004',
                'phone_number': '+91 666-666-6666'
            }
        ]
        
        for user_data in users_data:
            user = User(
                name=user_data['name'],
                email=user_data['email'],
                role=user_data['role'],
                department=user_data['department'],
                employee_id=user_data['employee_id'],
                phone_number=user_data['phone_number']
            )
            user.set_password(user_data['password'])
            db.session.add(user)
        
        db.session.commit()
        print(f'✅ Created {len(users_data)} sample users')
        print('\nSample Users:')
        for user_data in users_data:
            print(f"  - {user_data['email']} / {user_data['password']} ({user_data['role']})")

def seed_leaves():
    """Seed database with sample leave requests"""
    with app.app_context():
        # Check if leaves already exist
        if Leave.query.count() > 0:
            print('⚠️ Leaves already exist. Skipping seed.')
            return
        
        # Get users
        faculty = User.query.filter_by(role='faculty').first()
        coordinator = User.query.filter_by(role='coordinator').first()
        
        if not faculty:
            print('⚠️ No faculty user found. Create users first.')
            return
        
        # Create sample leaves
        leaves_data = [
            {
                'user_id': faculty.id,
                'leave_type': 'Casual Leave',
                'start_date': datetime.now().date() + timedelta(days=5),
                'end_date': datetime.now().date() + timedelta(days=7),
                'number_of_days': 3,
                'reason': 'Family function',
                'status': 'Pending'
            },
            {
                'user_id': faculty.id,
                'leave_type': 'Sick Leave',
                'start_date': datetime.now().date() - timedelta(days=10),
                'end_date': datetime.now().date() - timedelta(days=9),
                'number_of_days': 2,
                'reason': 'Medical checkup',
                'status': 'Approved',
                'approved_by': coordinator.id if coordinator else None,
                'approver_name': coordinator.name if coordinator else '',
                'action_date': datetime.now() - timedelta(days=11)
            },
            {
                'user_id': faculty.id,
                'leave_type': 'Earned Leave',
                'start_date': datetime.now().date() - timedelta(days=30),
                'end_date': datetime.now().date() - timedelta(days=28),
                'number_of_days': 3,
                'reason': 'Personal work',
                'status': 'Rejected',
                'approved_by': coordinator.id if coordinator else None,
                'approver_name': coordinator.name if coordinator else '',
                'action_date': datetime.now() - timedelta(days=31),
                'rejection_reason': 'Overlapping with important project deadline'
            }
        ]
        
        for leave_data in leaves_data:
            leave = Leave(**leave_data)
            db.session.add(leave)
        
        db.session.commit()
        print(f'✅ Created {len(leaves_data)} sample leave requests')

def reset_database():
    """Reset database - DROP and CREATE all tables"""
    with app.app_context():
        print('⚠️ WARNING: This will delete ALL data!')
        confirm = input('Type "yes" to confirm: ')
        if confirm.lower() == 'yes':
            # Disable foreign key checks to allow dropping tables with constraints
            db.session.execute(db.text('SET FOREIGN_KEY_CHECKS=0;'))
            db.session.commit()
            
            # Drop all tables
            db.drop_all()
            
            # Re-enable foreign key checks
            db.session.execute(db.text('SET FOREIGN_KEY_CHECKS=1;'))
            db.session.commit()
            
            # Create tables
            db.create_all()
            print('✅ Database reset successfully')
        else:
            print('❌ Operation cancelled')

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'init':
            init_database()
        elif command == 'seed':
            seed_users()
            seed_leaves()
        elif command == 'seed-users':
            seed_users()
        elif command == 'seed-leaves':
            seed_leaves()
        elif command == 'reset':
            reset_database()
        else:
            print('Usage:')
            print('  python init_db.py init         - Create database tables')
            print('  python init_db.py seed         - Seed database with sample data')
            print('  python init_db.py seed-users   - Seed only users')
            print('  python init_db.py seed-leaves  - Seed only leaves')
            print('  python init_db.py reset        - Reset database (delete all data)')
    else:
        print('Usage:')
        print('  python init_db.py init         - Create database tables')
        print('  python init_db.py seed         - Seed database with sample data')
        print('  python init_db.py seed-users   - Seed only users')
        print('  python init_db.py seed-leaves  - Seed only leaves')
        print('  python init_db.py reset        - Reset database (delete all data)')
