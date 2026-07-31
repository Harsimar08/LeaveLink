# TechTimeOff Flask Backend

Complete Flask backend with MySQL database for the TechTimeOff Leave Management System.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- MySQL Server (or MySQL Workbench)
- pip (Python package manager)

### 1. Install MySQL

#### For macOS:
```bash
brew install mysql
brew services start mysql
```

#### For Windows:
Download and install MySQL from: https://dev.mysql.com/downloads/installer/

### 2. Create Database

Open MySQL Workbench or command line:

```sql
CREATE DATABASE techtimeoff;
```

### 3. Setup Backend

```bash
# Navigate to backend_flask directory
cd backend_flask

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

### 4. Configure Environment Variables

Edit `.env` file with your MySQL credentials:

```env
DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/techtimeoff
SECRET_KEY=your-super-secret-key
JWT_SECRET=your-jwt-secret-key
FRONTEND_URL=http://localhost:5173
PORT=5000
```

### 5. Run the Application

```bash
python app.py
```

The server will start on `http://localhost:5000`

## 📁 Project Structure

```
backend_flask/
├── app.py                 # Main application file
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore file
├── models/
│   ├── user.py           # User model
│   └── leave.py          # Leave model
└── routes/
    ├── auth.py           # Authentication routes
    ├── users.py          # User management routes
    └── leaves.py         # Leave management routes
```

## 🗄️ Database Schema

### Users Table
- id (Primary Key)
- name
- email (Unique)
- password_hash
- role (faculty, coordinator, chief_coordinator, principal)
- department
- employee_id (Unique)
- phone_number
- profile_image
- google_id, github_id
- is_active
- created_at, updated_at

### Leaves Table
- id (Primary Key)
- user_id (Foreign Key → users.id)
- leave_type
- start_date
- end_date
- number_of_days
- reason
- status (Pending, Approved, Rejected, Cancelled)
- approved_by (Foreign Key → users.id)
- approver_name
- action_date
- rejection_reason
- attachment
- created_at, updated_at

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users` - Get all users (coordinators+)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user (soft delete)

### Leaves
- `POST /api/leaves` - Create leave request
- `GET /api/leaves` - Get all leaves (filtered by role)
- `GET /api/leaves/:id` - Get leave by ID
- `PUT /api/leaves/:id` - Update leave request
- `DELETE /api/leaves/:id` - Cancel leave request
- `PATCH /api/leaves/:id/approve` - Approve leave (coordinators+)
- `PATCH /api/leaves/:id/reject` - Reject leave (coordinators+)

### Health
- `GET /` - API info
- `GET /api` - API endpoints info
- `GET /api/health` - Health check

## 🔑 Authentication

All API requests (except register/login) require JWT token in Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🧪 Testing the API

### Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "faculty",
    "department": "Computer Science"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "role": "faculty"
  }'
```

### Create Leave Request
```bash
curl -X POST http://localhost:5000/api/leaves \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "leaveType": "Casual Leave",
    "startDate": "2024-12-01",
    "endDate": "2024-12-03",
    "numberOfDays": 3,
    "reason": "Family function"
  }'
```

## 🔄 Migration from MongoDB to MySQL

Key changes:
- Replaced Mongoose with SQLAlchemy
- Changed ObjectId to Integer IDs
- Updated all routes to use SQLAlchemy queries
- Maintained the same API structure for frontend compatibility

## 📝 Notes

- Database tables are created automatically on first run
- Passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- Soft delete is used for users (is_active flag)
- Leave requests can be cancelled (not deleted)

## 🐛 Troubleshooting

### "Access denied for user"
- Check your MySQL username and password in `.env`
- Make sure MySQL server is running

### "Unknown database"
- Create the database: `CREATE DATABASE techtimeoff;`

### "No module named 'MySQLdb'"
- Install PyMySQL: `pip install PyMySQL`

### Port already in use
- Change PORT in `.env` file
- Or kill the process using port 5000

## 🚀 Production Deployment

For production:
1. Set `FLASK_ENV=production` in `.env`
2. Use a production-grade server (gunicorn):
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```
3. Use environment variables instead of `.env` file
4. Enable HTTPS
5. Use a production database (MySQL on cloud)

## 📧 Support

For issues or questions, please check the documentation or create an issue.
