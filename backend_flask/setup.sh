#!/bin/bash

echo "🚀 TechTimeOff Flask Backend Setup"
echo "=================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

echo "✅ Python $(python3 --version) found"
echo ""

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "⚠️ MySQL is not installed or not in PATH."
    echo "Please install MySQL Server or MySQL Workbench."
    echo ""
    echo "macOS: brew install mysql"
    echo "Windows: Download from https://dev.mysql.com/downloads/installer/"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "📦 Creating virtual environment..."
python3 -m venv venv

echo "✅ Virtual environment created"
echo ""

echo "🔌 Activating virtual environment..."
source venv/bin/activate

echo "✅ Virtual environment activated"
echo ""

echo "📥 Installing dependencies..."
pip install -r requirements.txt

echo "✅ Dependencies installed"
echo ""

echo "⚙️ Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo ""
    echo "⚠️ IMPORTANT: Please edit .env file with your MySQL credentials:"
    echo "   DATABASE_URL=mysql+pymysql://username:password@localhost:3306/techtimeoff"
    echo ""
else
    echo "⚠️ .env file already exists. Skipping..."
    echo ""
fi

echo "📊 Creating database..."
echo ""
echo "Please run the following SQL command in MySQL Workbench or command line:"
echo "   CREATE DATABASE IF NOT EXISTS techtimeoff;"
echo ""
read -p "Press Enter when done..."

echo ""
echo "🗄️ Initializing database tables..."
python init_db.py init

echo ""
echo "🌱 Seeding database with sample data..."
read -p "Do you want to seed the database with sample users and leave requests? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python init_db.py seed
    echo "✅ Database seeded successfully"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the server:"
echo "  source venv/bin/activate  # Activate virtual environment"
echo "  python app.py             # Start the server"
echo ""
echo "The server will run on http://localhost:5000"
echo ""
echo "Sample users (if seeded):"
echo "  kritika@jims.edu / password123 (faculty)"
echo "  rajesh@jims.edu / password123 (coordinator)"
echo "  sunita@jims.edu / password123 (chief_coordinator)"
echo "  amit@jims.edu / password123 (principal)"
echo ""
