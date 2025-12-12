#!/bin/bash

# Create DMG installer for Timekeeper Payroll
# This script creates a user-friendly DMG installer with drag-to-Applications

APP_NAME="Timekeeper Payroll"
# Use project root dist directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_PATH="${PROJECT_ROOT}/dist/${APP_NAME}.app"
DMG_NAME="TimekeeperPayroll-v2.0.10"
DMG_PATH="${PROJECT_ROOT}/dist/${DMG_NAME}.dmg"
VOLUME_NAME="Timekeeper Payroll Installer"
TEMP_DMG="${PROJECT_ROOT}/dist/temp.dmg"

echo "🚀 Creating DMG installer for ${APP_NAME}..."

# Check if app exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: ${APP_PATH} not found!"
    echo "Please build the app first using: pyinstaller timekeeper.spec"
    exit 1
fi

# Remove old DMG if exists
if [ -f "$DMG_PATH" ]; then
    echo "🗑️  Removing old DMG..."
    rm "$DMG_PATH"
fi

if [ -f "$TEMP_DMG" ]; then
    rm "$TEMP_DMG"
fi

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "📁 Created temp directory: $TEMP_DIR"

# Copy app to temp directory
echo "📦 Copying app bundle..."
cp -R "$APP_PATH" "$TEMP_DIR/"

# Create Applications symlink for easy drag-and-drop installation
echo "🔗 Creating Applications symlink..."
ln -s /Applications "$TEMP_DIR/Applications"

# Calculate size needed for DMG (app size + 50MB buffer)
APP_SIZE=$(du -sm "$APP_PATH" | awk '{print $1}')
DMG_SIZE=$((APP_SIZE + 50))
echo "💾 DMG size will be: ${DMG_SIZE}MB"

# Create DMG
echo "🔨 Creating DMG..."
hdiutil create -volname "$VOLUME_NAME" -srcfolder "$TEMP_DIR" -ov -format UDZO "$DMG_PATH"

# Clean up temp directory
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

if [ -f "$DMG_PATH" ]; then
    DMG_SIZE_FINAL=$(du -h "$DMG_PATH" | awk '{print $1}')
    echo ""
    echo "✅ DMG created successfully!"
    echo "📍 Location: $DMG_PATH"
    echo "📦 Size: $DMG_SIZE_FINAL"
    echo ""
    echo "To distribute:"
    echo "  1. Test the DMG by double-clicking it"
    echo "  2. Drag the app to Applications folder"
    echo "  3. Eject the volume"
    echo "  4. Share the DMG file with users"
else
    echo "❌ Failed to create DMG"
    exit 1
fi
