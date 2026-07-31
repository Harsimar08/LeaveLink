"""
Direct MySQL query to show all users
This script connects directly to MySQL without using Flask/SQLAlchemy
"""
import pymysql
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

def parse_database_url(url):
    """Parse DATABASE_URL to get connection parameters"""
    # Format: mysql+pymysql://user:password@host:port/database
    # or: mysql+pymysql://user@host:port/database (no password)
    
    try:
        # Remove the mysql+pymysql:// prefix
        url = url.replace('mysql+pymysql://', '')
        
        # Split by @
        if '@' in url:
            auth_part, server_part = url.split('@', 1)
        else:
            return None
        
        # Parse auth (username:password or just username)
        if ':' in auth_part:
            username, password = auth_part.split(':', 1)
        else:
            username = auth_part
            password = ''
        
        # Parse server (host:port/database)
        if '/' in server_part:
            host_port, database = server_part.split('/', 1)
        else:
            return None
        
        # Parse host and port
        if ':' in host_port:
            host, port = host_port.split(':', 1)
            port = int(port)
        else:
            host = host_port
            port = 3306
        
        return {
            'host': host,
            'port': port,
            'user': username,
            'password': password,
            'database': database
        }
    except Exception as e:
        print(f"Error parsing DATABASE_URL: {e}")
        return None

def show_all_users():
    """Query and display all users directly from MySQL"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL', 'mysql+pymysql://root@localhost:3306/techtimeoff')
    
    # Parse connection parameters
    db_config = parse_database_url(database_url)
    
    if not db_config:
        print("❌ Failed to parse DATABASE_URL")
        return
    
    connection = None
    try:
        # Connect to MySQL
        print(f"\n🔌 Connecting to MySQL database: {db_config['database']}@{db_config['host']}:{db_config['port']}")
        
        connection = pymysql.connect(
            host=db_config['host'],
            port=db_config['port'],
            user=db_config['user'],
            password=db_config['password'],
            database=db_config['database'],
            cursorclass=pymysql.cursors.DictCursor
        )
        
        print("✅ Connected successfully!\n")
        
        with connection.cursor() as cursor:
            # Execute query
            sql = "SELECT * FROM users"
            print(f"🔍 SQL Query: {sql}\n")
            print("="*120)
            
            cursor.execute(sql)
            users = cursor.fetchall()
            
            if not users:
                print("\n❌ No users found in the database.")
                print("\nTo add sample users, run: python init_db.py seed\n")
                return
            
            print(f"\n📊 Total users: {len(users)}\n")
            
            # Print table header
            print(f"{'ID':<5} {'Name':<25} {'Email':<35} {'Role':<20} {'Active':<8} {'Created':<20}")
            print("-"*120)
            
            # Print each user
            for user in users:
                active = "Yes" if user.get('is_active', 0) == 1 else "No"
                created = user.get('created_at', '')
                if created:
                    created = str(created)[:19]
                
                print(f"{user['id']:<5} {user['name'][:25]:<25} {user['email'][:35]:<35} {user['role']:<20} {active:<8} {created:<20}")
            
            print("-"*120)
            print(f"\n✅ {len(users)} row(s) returned\n")
            
            # Show summary by role
            print("="*120)
            print("👥 Users by Role:")
            print("-"*120)
            
            roles = {}
            for user in users:
                role = user['role']
                if role not in roles:
                    roles[role] = []
                roles[role].append(user['name'])
            
            for role, names in roles.items():
                print(f"\n{role.upper().replace('_', ' ')} ({len(names)} user(s)):")
                for name in names:
                    print(f"  • {name}")
            
            print("\n" + "="*120 + "\n")
            
    except pymysql.Error as e:
        print(f"\n❌ MySQL Error: {e}\n")
        print("Possible issues:")
        print("  1. MySQL server not running")
        print("     macOS: brew services start mysql")
        print("     or: mysql.server start")
        print("  2. Database 'techtimeoff' doesn't exist")
        print("     Create it: CREATE DATABASE techtimeoff;")
        print("  3. Wrong credentials in .env file")
        print()
        
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        import traceback
        traceback.print_exc()
        
    finally:
        if connection:
            connection.close()
            print("🔌 Database connection closed.\n")

if __name__ == '__main__':
    show_all_users()
