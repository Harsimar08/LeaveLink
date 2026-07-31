"""
Query script to display all users in the database
"""
from app import app, db
from models.user import User
from tabulate import tabulate

def show_all_users():
    """Display all users in a formatted table"""
    with app.app_context():
        try:
            # Query all users
            users = User.query.all()
            
            if not users:
                print("\n❌ No users found in the database.\n")
                return
            
            print(f"\n📊 Total Users: {len(users)}\n")
            print("="*120)
            
            # Prepare data for table
            table_data = []
            for user in users:
                table_data.append([
                    user.id,
                    user.name,
                    user.email,
                    user.role,
                    user.department or 'N/A',
                    user.employee_id or 'N/A',
                    user.phone_number or 'N/A',
                    '✓' if user.is_active else '✗',
                    user.created_at.strftime('%Y-%m-%d %H:%M') if user.created_at else 'N/A'
                ])
            
            # Display as table
            headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'Employee ID', 'Phone', 'Active', 'Created']
            print(tabulate(table_data, headers=headers, tablefmt='grid'))
            print("="*120)
            print()
            
            # Display detailed information for each user
            print("\n📋 Detailed User Information:\n")
            for user in users:
                print(f"{'─'*80}")
                print(f"ID: {user.id}")
                print(f"Name: {user.name}")
                print(f"Email: {user.email}")
                print(f"Role: {user.role}")
                print(f"Department: {user.department or 'N/A'}")
                print(f"Employee ID: {user.employee_id or 'N/A'}")
                print(f"Phone: {user.phone_number or 'N/A'}")
                print(f"Active: {'Yes' if user.is_active else 'No'}")
                print(f"Google ID: {user.google_id or 'N/A'}")
                print(f"GitHub ID: {user.github_id or 'N/A'}")
                print(f"Created: {user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else 'N/A'}")
                print(f"Updated: {user.updated_at.strftime('%Y-%m-%d %H:%M:%S') if user.updated_at else 'N/A'}")
                print()
            
        except Exception as e:
            print(f"\n❌ Error querying database: {str(e)}\n")
            import traceback
            traceback.print_exc()

def show_users_by_role():
    """Display users grouped by role"""
    with app.app_context():
        try:
            roles = ['faculty', 'coordinator', 'chief_coordinator', 'principal', 'management']
            
            print("\n👥 Users by Role:\n")
            print("="*80)
            
            for role in roles:
                users = User.query.filter_by(role=role).all()
                print(f"\n{role.upper().replace('_', ' ')} ({len(users)} users):")
                print("─"*80)
                
                if users:
                    for user in users:
                        status = "✓ Active" if user.is_active else "✗ Inactive"
                        print(f"  • {user.name} ({user.email}) - {status}")
                else:
                    print("  No users found")
            
            print("\n" + "="*80 + "\n")
            
        except Exception as e:
            print(f"\n❌ Error querying database: {str(e)}\n")

def show_simple_query():
    """Simple SQL-like query display"""
    with app.app_context():
        try:
            print("\n🔍 SQL Query: SELECT * FROM users;\n")
            print("="*120)
            
            users = User.query.all()
            
            if not users:
                print("No results found.")
                return
            
            # Print column headers
            print(f"{'ID':<5} {'Name':<25} {'Email':<30} {'Role':<20} {'Department':<15} {'Active':<8}")
            print("─"*120)
            
            # Print rows
            for user in users:
                print(f"{user.id:<5} {user.name:<25} {user.email:<30} {user.role:<20} {(user.department or 'N/A'):<15} {'Yes' if user.is_active else 'No':<8}")
            
            print("="*120)
            print(f"\n{len(users)} rows returned\n")
            
        except Exception as e:
            print(f"\n❌ Error: {str(e)}\n")

if __name__ == '__main__':
    import sys
    
    print("\n" + "="*120)
    print(" "*40 + "TechTimeOff - User Database Query")
    print("="*120)
    
    # Check if tabulate is available
    try:
        import tabulate
        has_tabulate = True
    except ImportError:
        has_tabulate = False
        print("\n⚠️  Note: Install 'tabulate' for better formatting: pip install tabulate\n")
    
    # Show menu
    if len(sys.argv) > 1:
        option = sys.argv[1]
    else:
        print("\nOptions:")
        print("  1. Show all users (table format)")
        print("  2. Show users by role")
        print("  3. Show simple query")
        print("\nUsage: python query_users.py [1|2|3]")
        print("Or just: python query_users.py (defaults to all)\n")
        option = input("Enter option (default: 1): ").strip() or "1"
    
    if option == "1":
        if has_tabulate:
            show_all_users()
        else:
            show_simple_query()
    elif option == "2":
        show_users_by_role()
    elif option == "3":
        show_simple_query()
    else:
        print("Invalid option. Using default (1).")
        if has_tabulate:
            show_all_users()
        else:
            show_simple_query()
