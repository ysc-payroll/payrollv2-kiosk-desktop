#!/bin/bash
# Production startup script for Timekeeper Kiosk
# This script builds the frontend and runs the PyQt application

echo "=========================================="
echo "Timekeeper Kiosk - Production Mode"
echo "=========================================="
echo ""

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo ""
fi

# Build frontend
echo "🏗️  Building frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
cd ..
echo "✓ Frontend built successfully"
echo ""

# Check if Python virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
    echo ""
fi

echo "🖥️  Starting PyQt application..."
echo "   (Press ESC to exit fullscreen)"
echo ""

cd backend
source venv/bin/activate
python main.py

echo ""
echo "✓ Application closed"
