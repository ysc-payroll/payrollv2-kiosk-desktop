#!/bin/bash

# Development mode launcher for Timekeeper Payroll Desktop App
# This runs the app in dev mode, loading from Vite dev server

echo "🔧 Starting Timekeeper Payroll in DEV MODE"
echo "📝 Make sure Vite dev server is running: cd frontend && npm run dev"
echo ""

export DEV_MODE=true
python main.py
