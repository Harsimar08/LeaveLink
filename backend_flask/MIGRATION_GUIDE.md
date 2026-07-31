# Migration Guide: MongoDB to Flask + MySQL

This guide will help you migrate from the Node.js + MongoDB backend to Flask + MySQL.

## 📋 Prerequisites

- Python 3.8+
- MySQL Server or MySQL Workbench
- pip (Python package manager)

## 🔄 Step-by-Step Migration

### 1. Install MySQL

#### macOS:
```bash
brew install mysql
brew services start mysql

# Secure your MySQL installation
mysql_secure_installation
```

#### Windows:
1. Download MySQL Installer from: https://dev.mysql.com/downloads/installer/
2. Run the installer and choose "Developer Default"
3. Follow the installation wizard
4. Remember your root password!

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation
```

### 2. Create Database

Open MySQL Workbench or command line:

```sql
-- Login to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE techtimeoff;

-- (Optional) Create a dedicated user
CREATE USER 'techtimeoff_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON techtimeoff.* TO 'techtimeoff_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

### 3. Setup Flask Backend

```bash
# Navigate to the Flask backend directory
cd backend_flask

# Run the setup script
# macOS/Linux:
chmod +x setup.sh
./setup.sh

# Windows:
setup.bat
```

Or manually:

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your MySQL credentials
# DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/techtimeoff

# Initialize database
python init_db.py init

# Seed with sample data (optional)
python init_db.py seed
```

### 4. Update Frontend API URL

Update your frontend to point to the new Flask backend:

#### Option 1: Environment Variable (Recommended)
Create/update `.env` in your frontend (Vite project):

```env
VITE_API_URL=http://localhost:5000/api
```

#### Option 2: Update API calls directly
If your frontend has a centralized API configuration file, update the base URL:

```javascript
const API_URL = 'http://localhost:5000/api'
```

### 5. Test the Migration

#### Start the Flask server:
```bash
cd backend_flask
source venv/bin/activate  # Windows: venv\Scripts\activate
python app.py
```

Server should start on http://localhost:5000

#### Test Authentication:
```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "faculty",
    "department": "Computer Science"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "faculty"
  }'
```

### 6. Run Frontend

```bash
cd ..  # Go back to project root
npm run dev
```

## 🔍 Key Differences

### Database Changes

| MongoDB | MySQL |
|---------|-------|
| `_id` (ObjectId) | `id` (Integer) |
| Document-based | Relational tables |
| Flexible schema | Fixed schema |
| Mongoose ODM | SQLAlchemy ORM |

### API Compatibility

The Flask backend maintains **100% API compatibility** with the Node.js backend:
- Same endpoints
- Same request/response format
- Same authentication (JWT)
- Same field names (camelCase in JSON)

### Code Changes

#### Before (Node.js):
```javascript
const user = await User.findOne({ email })
```

#### After (Flask):
```python
user = User.query.filter_by(email=email).first()
```

## 📊 Data Migration (Optional)

If you have existing data in MongoDB:

### 1. Export from MongoDB:
```bash
mongoexport --db techtimeoff --collection users --out users.json
mongoexport --db techtimeoff --collection leaves --out leaves.json
```

### 2. Create a migration script:

```python
# migrate_data.py
import json
from app import app, db
from models.user import User
from models.leave import Leave
from datetime import datetime

def migrate_users():
    with open('users.json', 'r') as f:
        users_data = [json.loads(line) for line in f]
    
    with app.app_context():
        for user_data in users_data:
            user = User(
                name=user_data['name'],
                email=user_data['email'],
                password_hash=user_data['password'],  # Already hashed
                role=user_data['role'],
                department=user_data.get('department'),
                employee_id=user_data.get('employeeId'),
                phone_number=user_data.get('phoneNumber')
            )
            db.session.add(user)
        db.session.commit()

def migrate_leaves():
    # Similar process for leaves
    pass

if __name__ == '__main__':
    migrate_users()
    migrate_leaves()
```

## 🔧 Troubleshooting

### "Access denied for user"
- Check MySQL credentials in `.env`
- Verify MySQL is running: `sudo systemctl status mysql` (Linux) or `brew services list` (macOS)

### "Unknown database 'techtimeoff'"
- Create the database: `CREATE DATABASE techtimeoff;`

### "No module named 'MySQLdb'"
- PyMySQL is installed as a dependency. Make sure you activated the virtual environment.

### Port 5000 already in use
- Change `PORT` in `.env`
- Or kill the process: `lsof -ti:5000 | xargs kill -9`

### Frontend can't connect
- Check CORS settings in `app.py`
- Verify `FRONTEND_URL` in `.env`
- Check browser console for CORS errors

## 🚀 Production Deployment

### Using Gunicorn (Linux/macOS):
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Using Waitress (Windows):
```bash
pip install waitress
waitress-serve --port=5000 app:app
```

### Environment Variables for Production:
```env
FLASK_ENV=production
DATABASE_URL=mysql+pymysql://user:pass@production-host:3306/techtimeoff
SECRET_KEY=very-long-random-secret-key
JWT_SECRET=another-very-long-random-key
FRONTEND_URL=https://your-production-frontend.com
```

## 📝 Notes

- The Flask backend is **fully compatible** with your existing frontend
- No frontend code changes required (except API URL)
- All endpoints work exactly the same
- JWT authentication is maintained
- Data validation is preserved

## ✅ Verification Checklist

- [ ] MySQL installed and running
- [ ] Database `techtimeoff` created
- [ ] Virtual environment created and activated
- [ ] Dependencies installed from `requirements.txt`
- [ ] `.env` file configured with MySQL credentials
- [ ] Database initialized: `python init_db.py init`
- [ ] Flask server starts without errors
- [ ] Can register a new user
- [ ] Can login successfully
- [ ] Can create a leave request
- [ ] Frontend connects to new backend

## 🆘 Getting Help

If you encounter issues:
1. Check the error messages carefully
2. Verify all steps were completed
3. Check MySQL logs
4. Check Flask application logs
5. Review the README.md for more details

## 🎉 Success!

Once everything is working:
1. You can safely archive the old `backend/` directory (Node.js + MongoDB)
2. Update your deployment scripts to use Flask
3. Update documentation to reflect the new stack

The migration is complete! 🚀
