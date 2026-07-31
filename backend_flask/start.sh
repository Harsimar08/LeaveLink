#!/bin/bash

# Quick start script for TechTimeOff Flask backend

echo "🚀 Starting TechTimeOff Flask Backend..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run setup.sh first:"
    echo "  ./setup.sh"
    exit 1
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please create .env from .env.example and configure your MySQL credentials"
    exit 1
fi

# Start the server
echo "✅ Starting Flask server..."
echo ""
python app.py
