@echo off
REM Quick start script for LeaveLink Flask backend

echo ========================================
echo Starting LeaveLink Flask Backend
echo ========================================
echo.

REM Check if virtual environment exists
if not exist venv (
    echo ❌ Virtual environment not found!
    echo Please run setup.bat first
    pause
    exit /b 1
)

REM Activate virtual environment
echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if .env file exists
if not exist .env (
    echo ❌ .env file not found!
    echo Please create .env from .env.example and configure your MySQL credentials
    pause
    exit /b 1
)

REM Start the server
echo ✅ Starting Flask server...
echo.
python app.py
