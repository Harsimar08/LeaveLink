"""
Simple script to query and display all users from the database
Run: python show_users.py
"""
import sys
import os

# Add the current directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models.user import User

def main():
    with app.app_context():
        try:
            # Query all users
            users = User.query.all()
            
            print("\n" + "="*100)
            print(f"🔍 SQL QUERY: SELECT * FROM users;")
            print("="*100 + "\n")
            
            if not users:
                print("❌ No users found in the database.")
                print("\nPossible reasons:")
                print("  1. Database is empty (run: python init_db.py seed)")
                print("  2. MySQL server is not running")
                print("  3. Database connection error")
                print()
                return
            
            print(f"📊 Total users found: {len(users)}\n")
            
            # Print table header
            print(f"{'ID':<5} {'Name':<25} {'Email':<35} {'Role':<20} {'Dept':<15} {'Active':<8}")
            print("-"*100)
            
            # Print each user
            for user in users:
                dept = user.department[:12] + '...' if user.department and len(user.department) > 15 else (user.department or 'N/A')
                active = "Yes" if user.is_active else "No"
                print(f"{user.id:<5} {user.name[:25]:<25} {user.email[:35]:<35} {user.role:<20} {dept:<15} {active:<8}")
            
            print("-"*100)
            print(f"\n✅ {len(users)} row(s) returned\n")
            
            # Show detailed view option
            show_details = input("Show detailed user information? (y/n): ").strip().lower()
            
            if show_details == 'y':
                print("\n" + "="*100)
                print("📋 DETAILED USER INFORMATION")
                print("="*100 + "\n")
                
                for i, user in enumerate(users, 1):
                    print(f"User #{i}")
                    print("─"*80)
                    print(f"  ID:           {user.id}")
                    print(f"  Name:         {user.name}")
                    print(f"  Email:        {user.email}")
                    print(f"  Role:         {user.role}")
                    print(f"  Department:   {user.department or 'N/A'}")
                    print(f"  Employee ID:  {user.employee_id or 'N/A'}")
                    print(f"  Phone:        {user.phone_number or 'N/A'}")
                    print(f"  Active:       {'Yes' if user.is_active else 'No'}")
                    print(f"  Google ID:    {user.google_id or 'N/A'}")
                    print(f"  GitHub ID:    {user.github_id or 'N/A'}")
                    print(f"  Created:      {user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else 'N/A'}")
                    print(f"  Updated:      {user.updated_at.strftime('%Y-%m-%d %H:%M:%S') if user.updated_at else 'N/A'}")
                    print()
            
            # Show users by role
            print("\n" + "="*100)
            print("👥 USERS BY ROLE")
            print("="*100 + "\n")
            
            roles = ['faculty', 'coordinator', 'chief_coordinator', 'principal', 'management']
            for role in roles:
                role_users = [u for u in users if u.role == role]
                print(f"{role.upper().replace('_', ' ')}: {len(role_users)} user(s)")
                if role_users:
                    for user in role_users:
                        print(f"  • {user.name} ({user.email})")
            print()
            
        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}\n")
            print("Possible issues:")
            print("  1. MySQL server not running (macOS: brew services start mysql)")
            print("  2. Database doesn't exist")
            print("  3. Wrong credentials in .env file")
            print()
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    main()
