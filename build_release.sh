#!/bin/bash

# ============================================
# Timekeeper Payroll - Complete Build Script
# ============================================
# This script:
#   1. Builds the Vue.js frontend
#   2. Creates PyInstaller app bundle
#   3. Generates DMG installer
# ============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Timekeeper Payroll - Release Build${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}[1/4] Checking prerequisites...${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Error: npm is not installed${NC}"
    exit 1
fi

# Check if pyinstaller is available
cd "$BACKEND_DIR"
if ! pyinstaller --version &> /dev/null; then
    echo -e "${RED}❌ Error: pyinstaller is not installed${NC}"
    echo "Install with: pip3 install pyinstaller"
    exit 1
fi

# Check if create_dmg.sh exists
if [ ! -f "$BACKEND_DIR/create_dmg.sh" ]; then
    echo -e "${RED}❌ Error: create_dmg.sh not found in backend directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Step 2: Build frontend
echo -e "${YELLOW}[2/4] Building Vue.js frontend...${NC}"
cd "$FRONTEND_DIR"

# Clean previous build
if [ -d "dist" ]; then
    echo "Cleaning previous build..."
    rm -rf dist
fi

# Run build
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build completed${NC}"

    # Show build size
    if [ -d "dist" ]; then
        DIST_SIZE=$(du -sh dist | cut -f1)
        echo "   Build size: $DIST_SIZE"
    fi
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi
echo ""

# Step 3: Create PyInstaller bundle
echo -e "${YELLOW}[3/4] Building PyInstaller app bundle...${NC}"
cd "$BACKEND_DIR"

# Set correct Python version
pyenv local 3.10.13

# Clean previous build
echo "Cleaning previous build artifacts..."
rm -rf build
rm -rf "$PROJECT_ROOT/dist"

# Create project root dist directory
mkdir -p "$PROJECT_ROOT/dist"

# Run PyInstaller with custom dist path
pyinstaller --clean --distpath "$PROJECT_ROOT/dist" --workpath "$BACKEND_DIR/build" timekeeper.spec

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PyInstaller build completed${NC}"

    # Show app bundle info
    if [ -d "$PROJECT_ROOT/dist/Timekeeper Payroll.app" ]; then
        APP_SIZE=$(du -sh "$PROJECT_ROOT/dist/Timekeeper Payroll.app" | cut -f1)
        echo "   App bundle size: $APP_SIZE"
    fi

    # CRITICAL FIX: Move QtWebEngineProcess Helpers and Resources to correct location
    # PyInstaller places them in Versions/Resources/ but they should be in Versions/A/
    echo "Fixing QtWebEngine framework structure..."
    FRAMEWORK_PATH="$PROJECT_ROOT/dist/Timekeeper Payroll.app/Contents/Frameworks/PyQt6/Qt6/lib/QtWebEngineCore.framework"

    # Move Helpers directory
    if [ -d "$FRAMEWORK_PATH/Versions/Resources/Helpers" ] && [ ! -d "$FRAMEWORK_PATH/Versions/A/Helpers" ]; then
        mv "$FRAMEWORK_PATH/Versions/Resources/Helpers" "$FRAMEWORK_PATH/Versions/A/Helpers"
        echo -e "${GREEN}✅ Moved Helpers directory to Versions/A/${NC}"
    fi

    # Copy Resources content (keep original for other potential symlinks)
    if [ -d "$FRAMEWORK_PATH/Versions/Resources/Resources" ]; then
        cp -R "$FRAMEWORK_PATH/Versions/Resources/Resources/"* "$FRAMEWORK_PATH/Versions/A/Resources/" 2>/dev/null
        echo -e "${GREEN}✅ Copied Resources to Versions/A/${NC}"
    fi
else
    echo -e "${RED}❌ PyInstaller build failed${NC}"
    exit 1
fi
echo ""

# Step 4: Create DMG installer
echo -e "${YELLOW}[4/4] Creating DMG installer...${NC}"

# Run create_dmg script
./create_dmg.sh

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ DMG creation completed${NC}"

    # Show DMG info
    DMG_FILE=$(ls -t "$PROJECT_ROOT/dist"/*.dmg 2>/dev/null | head -1)
    if [ -f "$DMG_FILE" ]; then
        DMG_SIZE=$(du -sh "$DMG_FILE" | cut -f1)
        DMG_NAME=$(basename "$DMG_FILE")

        echo ""
        echo -e "${GREEN}============================================${NC}"
        echo -e "${GREEN}  Build Successful! 🎉${NC}"
        echo -e "${GREEN}============================================${NC}"
        echo ""
        echo -e "${BLUE}📦 DMG File:${NC} $DMG_NAME"
        echo -e "${BLUE}📍 Location:${NC} $DMG_FILE"
        echo -e "${BLUE}💾 Size:${NC} $DMG_SIZE"
        echo ""
        echo -e "${YELLOW}Next Steps:${NC}"
        echo "  1. Test the DMG by double-clicking it"
        echo "  2. Drag the app to Applications folder"
        echo "  3. Launch and verify functionality"
        echo "  4. Share with users"
        echo ""
    fi
else
    echo -e "${RED}❌ DMG creation failed${NC}"
    exit 1
fi
