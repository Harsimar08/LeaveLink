@echo off
echo ========================================
echo Database Schema Fix for TechTimeoff
echo ========================================
echo.
echo This script will fix the database schema mismatch error.
echo.
echo ⚠️ IMPORTANT: This will reset your database and DELETE ALL DATA!
echo.
set /p confirm="Are you sure you want to continue? (y/n): "
if /i not "%confirm%"=="y" (
    echo Operation cancelled.
    pause
    exit /b 0
)
echo.

echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ Failed to activate virtual environment
    echo Make sure you're in the backend_flask folder
    pause
    exit /b 1
)
echo ✅ Virtual environment activated
echo.

echo � Checking dependencies...
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Flask not found. Installing dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
) else (
    echo ✅ Dependencies already installed
)
echo.

echo �🗄️ Resetting database...
python init_db.py reset
if errorlevel 1 (
    echo ❌ Failed to reset database
    echo.
    echo Possible issues:
    echo   1. MySQL server not running (run: net start MySQL80)
    echo   2. Wrong credentials in .env file
    echo   3. Database doesn't exist
    echo.
    pause
    exit /b 1
)
echo ✅ Database reset complete
echo.

echo 📊 Initializing database tables...
python init_db.py init
if errorlevel 1 (
    echo ❌ Failed to initialize database
    pause
    exit /b 1
)
echo ✅ Database tables created
echo.

echo 🌱 Seeding sample data...
python init_db.py seed
if errorlevel 1 (
    echo ❌ Failed to seed database
    pause
    exit /b 1
)
echo ✅ Sample data added
echo.

echo ========================================
echo 🎉 Database Fixed Successfully!
echo ========================================
echo.
echo Sample users created:
echo   Email: kritika@jims.edu
echo   Password: password123
echo   Role: faculty
echo.
echo You can now start the server with:
echo   python app.py
echo.
pause
