# MySQL Workbench Setup Guide

Complete guide to setting up MySQL Workbench for TechTimeOff

## 📥 Download and Install

### Windows
1. Download MySQL Installer: https://dev.mysql.com/downloads/installer/
2. Choose "MySQL Installer for Windows"
3. Run the installer
4. Select "Developer Default" setup type
5. Follow the installation wizard
6. Set a root password (remember this!)

### macOS
1. Download MySQL Community Server: https://dev.mysql.com/downloads/mysql/
2. Run the DMG installer
3. Follow installation steps
4. Note the temporary root password
5. Download MySQL Workbench: https://dev.mysql.com/downloads/workbench/
6. Install MySQL Workbench

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install mysql-server mysql-workbench
sudo systemctl start mysql
sudo mysql_secure_installation
```

## 🔌 Connect to MySQL

### 1. Open MySQL Workbench

### 2. Create a New Connection
- Click "+" next to "MySQL Connections"
- Connection Name: `TechTimeOff Local`
- Hostname: `localhost` or `127.0.0.1`
- Port: `3306`
- Username: `root` (or your MySQL username)
- Click "Store in Keychain" and enter your MySQL password
- Click "Test Connection"
- If successful, click "OK"

## 🗄️ Create Database

### 1. Open the Connection
Double-click on "TechTimeOff Local" connection

### 2. Run SQL Script
In the SQL editor, paste and execute:

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS techtimeoff
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Use the database
USE techtimeoff;

-- Show databases to confirm
SHOW DATABASES;
```

Click the lightning bolt icon (⚡) to execute

### 3. Create User (Optional but Recommended)
```sql
-- Create dedicated user for the application
CREATE USER 'techtimeoff_user'@'localhost' 
  IDENTIFIED BY 'SecurePassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON techtimeoff.* 
  TO 'techtimeoff_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify user
SELECT User, Host FROM mysql.user 
  WHERE User = 'techtimeoff_user';
```

## ⚙️ Configure Flask Backend

Update your `.env` file:

### If using root user:
```env
DATABASE_URL=mysql+pymysql://root:your_root_password@localhost:3306/techtimeoff
```

### If using dedicated user:
```env
DATABASE_URL=mysql+pymysql://techtimeoff_user:SecurePassword123!@localhost:3306/techtimeoff
```

## 🎨 Explore Database in Workbench

After running `python init_db.py init` and `python init_db.py seed`:

### 1. Refresh Schemas
- Right-click on "Schemas" in the Navigator panel
- Click "Refresh All"
- Expand "techtimeoff" database

### 2. View Tables
You should see:
- `users` - User accounts
- `leaves` - Leave requests

### 3. Browse Data
- Right-click on a table (e.g., `users`)
- Select "Select Rows - Limit 1000"
- View the data in a grid

### 4. Run Custom Queries

```sql
-- View all users
SELECT id, name, email, role, department 
FROM users;

-- View all leave requests
SELECT l.id, u.name as employee, l.leave_type, 
       l.start_date, l.end_date, l.status
FROM leaves l
JOIN users u ON l.user_id = u.id
ORDER BY l.created_at DESC;

-- Count leaves by status
SELECT status, COUNT(*) as count
FROM leaves
GROUP BY status;

-- Count users by role
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;
```

## 🔍 Useful Queries for Development

### Check User Credentials
```sql
-- Find user by email
SELECT * FROM users 
WHERE email = 'kritika@jims.edu';

-- Verify password hash exists
SELECT id, name, email, password_hash 
FROM users LIMIT 5;
```

### Monitor Leave Requests
```sql
-- Pending leaves
SELECT u.name, l.leave_type, l.start_date, l.end_date
FROM leaves l
JOIN users u ON l.user_id = u.id
WHERE l.status = 'Pending';

-- Recently approved leaves
SELECT u.name, l.leave_type, a.name as approved_by, l.action_date
FROM leaves l
JOIN users u ON l.user_id = u.id
LEFT JOIN users a ON l.approved_by = a.id
WHERE l.status = 'Approved'
ORDER BY l.action_date DESC;
```

### Database Statistics
```sql
-- Database size
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'techtimeoff'
GROUP BY table_schema;

-- Table row counts
SELECT 
    TABLE_NAME,
    TABLE_ROWS
FROM information_schema.tables
WHERE TABLE_SCHEMA = 'techtimeoff';
```

## 🛠️ Database Management

### Backup Database
```sql
-- In terminal (not Workbench):
mysqldump -u root -p techtimeoff > backup.sql
```

### Restore Database
```sql
-- In terminal:
mysql -u root -p techtimeoff < backup.sql
```

### Reset Database (⚠️ Caution!)
```sql
-- Drop all tables
DROP TABLE IF EXISTS leaves;
DROP TABLE IF EXISTS users;

-- Then run: python init_db.py init
```

## 📊 Visual Database Design

### 1. Create EER Diagram
- Database → Reverse Engineer
- Select "techtimeoff" database
- Click "Execute"
- View the Entity-Relationship diagram

### 2. Export Diagram
- File → Export → Export as PNG/PDF
- Save for documentation

## 🔐 Security Best Practices

### 1. Use Strong Passwords
```sql
-- Change root password
ALTER USER 'root'@'localhost' 
  IDENTIFIED BY 'NewStrongPassword123!';
```

### 2. Limit User Privileges
```sql
-- Grant only needed privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON techtimeoff.* 
  TO 'techtimeoff_user'@'localhost';
```

### 3. Regular Backups
Set up automated backups using MySQL Workbench:
- Server → Data Export
- Select "techtimeoff" database
- Choose export options
- Schedule regular exports

## 🧪 Testing Queries

### Insert Test Data
```sql
-- Insert test user
INSERT INTO users (name, email, password_hash, role, department, created_at, updated_at)
VALUES ('Test User', 'test@test.com', '$2b$12$hash...', 'faculty', 'IT', NOW(), NOW());

-- Insert test leave
INSERT INTO leaves (user_id, leave_type, start_date, end_date, number_of_days, reason, status, created_at, updated_at)
VALUES (1, 'Casual Leave', '2024-12-01', '2024-12-03', 3, 'Testing', 'Pending', NOW(), NOW());
```

### Delete Test Data
```sql
-- Delete test records
DELETE FROM leaves WHERE reason = 'Testing';
DELETE FROM users WHERE email = 'test@test.com';
```

## 📱 MySQL Workbench Tips

### Keyboard Shortcuts
- `Ctrl/Cmd + Enter` - Execute current statement
- `Ctrl/Cmd + Shift + Enter` - Execute all statements
- `Ctrl/Cmd + T` - New query tab
- `Ctrl/Cmd + W` - Close query tab
- `Ctrl/Cmd + B` - Beautify query (format)

### Useful Features
1. **Auto-completion**: Start typing and press `Ctrl + Space`
2. **Query History**: View previous queries in the sidebar
3. **Result Export**: Right-click on results → Export
4. **SQL Templates**: Snippets → Custom templates

## 🆘 Troubleshooting

### Can't Connect to MySQL
1. Check if MySQL is running:
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status mysql
   
   # Windows
   services.msc (look for MySQL)
   ```

2. Verify port 3306 is open:
   ```bash
   netstat -an | grep 3306
   ```

3. Check firewall settings

### "Access Denied"
- Verify username and password
- Check user privileges:
  ```sql
  SHOW GRANTS FOR 'your_user'@'localhost';
  ```

### "Unknown Database"
- Create the database first
- Refresh schemas in Workbench
- Check database name spelling

## 📚 Additional Resources

- MySQL Documentation: https://dev.mysql.com/doc/
- MySQL Workbench Manual: https://dev.mysql.com/doc/workbench/en/
- SQL Tutorial: https://www.w3schools.com/sql/

## ✅ Verification Checklist

- [ ] MySQL Workbench installed
- [ ] Connected to local MySQL server
- [ ] Database `techtimeoff` created
- [ ] User created (if using dedicated user)
- [ ] Connection tested successfully
- [ ] Tables visible in Schemas navigator
- [ ] Sample queries executed successfully

## 🎉 You're All Set!

MySQL Workbench is now configured for TechTimeOff development!

You can:
- ✅ Browse and edit data visually
- ✅ Run SQL queries
- ✅ Monitor database performance
- ✅ Create backups
- ✅ Design and modify schema

Happy database management! 🗄️
