# Build & Release Guide

## Quick Build Script

### One-Command Build

```bash
./build_release.sh
```

This script will automatically:
1. ✅ Build Vue.js frontend (`npm run build`)
2. ✅ Create PyInstaller app bundle
3. ✅ Generate DMG installer
4. ✅ Show build summary

---

## Manual Build Process

If you prefer to run each step manually:

### Step 1: Build Frontend
```bash
cd frontend
npm run build
```

### Step 2: Build PyInstaller Bundle
```bash
cd backend
pyenv local 3.10.13
pyinstaller --clean timekeeper.spec
```

### Step 3: Create DMG
```bash
cd backend
./create_dmg.sh
```

---

## Before Building

### Update API URL (Important!)

Make sure the frontend is pointing to the correct API:

**For Production:**
```javascript
// frontend/src/services/http-client.js
const API_BASE_URL = 'https://api.theabbapayroll.com'
// const API_BASE_URL = 'http://localhost:8000'
```

**For Testing:**
```javascript
// frontend/src/services/http-client.js
// const API_BASE_URL = 'https://api.theabbapayroll.com'
const API_BASE_URL = 'http://localhost:8000'
```

---

## Build Output

After successful build, you'll find:

```
dist/
├── Timekeeper Payroll.app      # macOS app bundle
└── TimekeeperPayroll-v2.0.0.dmg # DMG installer
```

All build artifacts are in the **project root `dist/` directory**, not `backend/dist/`.

---

## Testing the Build

### Test the App Bundle
```bash
open "dist/Timekeeper Payroll.app"
```

### Test the DMG
1. Double-click `TimekeeperPayroll-v2.0.0.dmg`
2. Drag app to Applications folder
3. Eject the DMG volume
4. Launch from Applications

---

## Version Management

Update version numbers in:

1. **`backend/timekeeper.spec`**
   ```python
   name='Timekeeper Payroll',
   ```

2. **`backend/create_dmg.sh`**
   ```bash
   VERSION="2.0.0"
   ```

3. **`frontend/package.json`**
   ```json
   "version": "2.0.0"
   ```

---

## Build Checklist

Before creating a release build:

- [ ] Test all modules (Overtime, Leave, Holiday, etc.)
- [ ] Verify employee dropdown works
- [ ] Test error handling and toast notifications
- [ ] Check API URL points to production
- [ ] Update version numbers if needed
- [ ] Run in dev mode for final testing
- [ ] Build production bundle
- [ ] Test DMG installer
- [ ] Document any changes in CHANGELOG

---

## Troubleshooting

### Build fails at frontend step

**Problem:** npm build errors

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Build fails at PyInstaller step

**Problem:** Python version or dependencies

**Solution:**
```bash
pyenv local 3.10.13
pip3 install --upgrade pyinstaller
pyinstaller --clean timekeeper.spec
```

### DMG creation fails

**Problem:** Disk space or permissions

**Solution:**
```bash
# Clean old builds
rm -rf dist backend/build

# Check disk space
df -h

# Try again
./build_release.sh
```

### App crashes on launch

**Problem:** Missing dependencies or database issues

**Solution:**
- Check logs in `~/Desktop/timekeeper_debug.log`
- Ensure Python 3.10 is embedded
- Verify all resources are included in spec file

---

## Distribution

After building:

1. **Test thoroughly** on your machine
2. **Test on a clean machine** if possible
3. **Sign the app** (optional, requires Apple Developer account)
4. **Notarize** (optional, for Gatekeeper)
5. **Upload to distribution server**
6. **Share download link with users**

---

## Clean Build

To start fresh:

```bash
# Clean frontend
cd frontend
rm -rf dist node_modules

# Clean backend and project root
rm -rf dist backend/build

# Rebuild everything
./build_release.sh
```

---

## Build Sizes

Typical build sizes:

| Component | Size |
|-----------|------|
| Frontend dist | ~1-2 MB |
| App bundle | ~450-550 MB |
| DMG installer | ~200-250 MB (compressed) |

---

## Quick Commands

```bash
# Development mode
cd frontend && npm run dev                    # Terminal 1
cd backend && ./run_dev.sh                    # Terminal 2

# Production build
./build_release.sh                            # One command

# Manual build
cd frontend && npm run build                  # Step 1
cd backend && pyinstaller --clean --distpath ../dist --workpath build timekeeper.spec  # Step 2
cd backend && ./create_dmg.sh                 # Step 3

# Clean everything
rm -rf frontend/dist dist backend/build

# Test app
open "dist/Timekeeper Payroll.app"
```
