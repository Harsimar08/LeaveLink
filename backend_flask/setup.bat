@echo off
echo ========================================
echo TechTimeOff Flask Backend Setup (Windows)
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed!
    echo.
    echo Please install Python 3.8 or higher from:
    echo https://www.python.org/downloads/
    echo.
    echo ⚠️ Make sure to check "Add Python to PATH" during installation!
    echo.
    pause
    exit /b 1
)

echo ✅ Python found
python --version
echo.

REM Check if pip is available
pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pip is not installed!
    echo Please reinstall Python and ensure pip is included.
    pause
    exit /b 1
)

echo ✅ pip found
echo.

REM Check if MySQL is installed
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️ MySQL not found in PATH
    echo.
    echo Please ensure MySQL is installed from:
    echo https://dev.mysql.com/downloads/installer/
    echo.
    echo You can continue setup and add MySQL to PATH later.
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" (
        exit /b 1
    )
) else (
    echo ✅ MySQL found
    mysql --version
    echo.
)

echo 📦 Creating virtual environment...
if exist venv (
    echo ⚠️ Virtual environment already exists. Skipping creation...
) else (
    python -m venv venv
    echo ✅ Virtual environment created
)
echo.

echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ Failed to activate virtual environment
    echo.
    echo If you're using PowerShell, try:
    echo    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    echo    venv\Scripts\Activate.ps1
    echo.
    pause
    exit /b 1
)
echo ✅ Virtual environment activated
echo.

echo 📥 Upgrading pip...
python -m pip install --upgrade pip
echo.

echo 📥 Installing dependencies from requirements.txt...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    echo.
    echo Try manually with:
    echo    pip install Flask Flask-SQLAlchemy Flask-Bcrypt Flask-JWT-Extended Flask-CORS PyMySQL python-dotenv
    echo.
    pause
    exit /b 1
)
echo ✅ All dependencies installed successfully
echo.

echo ⚙️ Setting up environment variables...
if not exist .env (
    if exist .env.example (
        copy .env.example .env
        echo ✅ Created .env file from template
    ) else (
        echo Creating new .env file...
        (
            echo # Database Configuration
            echo DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/techtimeoff
            echo.
            echo # Secret Keys ^(generate random strings^)
            echo SECRET_KEY=your-secret-key-here-change-this-in-production
            echo JWT_SECRET=your-jwt-secret-here-change-this-in-production
            echo.
            echo # Frontend URL
            echo FRONTEND_URL=http://localhost:5173
            echo.
            echo # Server Configuration
            echo PORT=5000
            echo FLASK_ENV=development
        ) > .env
        echo ✅ Created new .env file
    )
    echo.
    echo ⚠️ IMPORTANT: Edit the .env file NOW with your MySQL credentials!
    echo.
    echo    1. Open .env file in Notepad or VS Code
    echo    2. Replace YOUR_PASSWORD with your MySQL root password
    echo    3. Change SECRET_KEY and JWT_SECRET to random strings
    echo.
    echo Example DATABASE_URL:
    echo    DATABASE_URL=mysql+pymysql://root:MyPass123@localhost:3306/techtimeoff
    echo.
    set /p editnow="Open .env in Notepad now? (y/n): "
    if /i "%editnow%"=="y" (
        notepad .env
    )
    echo.
) else (
    echo ⚠️ .env file already exists. Skipping creation...
    echo.
)

echo 📊 Database Setup
echo.
echo ⚠️ Make sure MySQL server is running!
echo.
echo You can check MySQL status with:
echo    net start ^| findstr MySQL
echo.
echo If MySQL is not running, start it with:
echo    net start MySQL80
echo.
echo Next, create the database by running ONE of these:
echo.
echo Option 1 - MySQL Workbench:
echo    1. Open MySQL Workbench
echo    2. Connect to Local instance
echo    3. Run: CREATE DATABASE IF NOT EXISTS techtimeoff;
echo.
echo Option 2 - Command Line:
echo    mysql -u root -p
echo    CREATE DATABASE IF NOT EXISTS techtimeoff;
echo    exit;
echo.
pause

echo.
echo 🗄️ Initializing database tables...
python init_db.py init

echo.
set /p SEED="Do you want to seed the database with sample data? (y/n): "
if /i "%SEED%"=="y" (
    python init_db.py seed
    echo ✅ Database seeded successfully
)

echo.
echo 🎉 Setup complete!
echo.
echo To start the server:
echo   venv\Scripts\activate.bat  # Activate virtual environment
echo   python app.py              # Start the server
echo.
echo The server will run on http://localhost:5000
echo.
echo Sample users (if seeded):
echo   kritika@jims.edu / password123 (faculty)
echo   rajesh@jims.edu / password123 (coordinator)
echo   sunita@jims.edu / password123 (chief_coordinator)
echo   amit@jims.edu / password123 (principal)
echo.
pause
