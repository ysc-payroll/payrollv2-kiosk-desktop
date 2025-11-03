#!/bin/bash
# Development startup script for Timekeeper Kiosk
# This script starts both the Vite dev server and PyQt application

echo "=========================================="
echo "Timekeeper Kiosk - Development Mode"
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

echo "🚀 Starting Vite dev server..."
cd frontend
npm run dev &
VITE_PID=$!
cd ..

# Wait for Vite to start
echo "⏳ Waiting for dev server to start..."
sleep 3

echo ""
echo "🖥️  Starting PyQt application..."
echo "   (Press ESC to exit fullscreen)"
echo ""

cd backend
source venv/bin/activate
python main.py

# Cleanup: Kill Vite dev server when PyQt app closes
echo ""
echo "🛑 Shutting down dev server..."
kill $VITE_PID 2>/dev/null

echo "✓ Done"
