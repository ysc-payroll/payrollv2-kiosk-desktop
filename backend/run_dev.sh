#!/bin/bash
# Development mode launcher
# This script runs the app with Vite dev server for hot-reload

echo "🚀 Starting Timekeeper Payroll in DEVELOPMENT MODE"
echo ""
echo "Prerequisites:"
echo "  1. Vite dev server must be running on http://localhost:5173"
echo "  2. Run in another terminal: cd frontend && npm run dev"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Set DEV_MODE environment variable and run
export DEV_MODE=true
python3 main.py
