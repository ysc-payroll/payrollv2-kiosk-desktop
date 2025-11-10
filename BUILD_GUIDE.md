# Build & Release Guide

## Quick Build Script

### macOS Build (One-Command)

```bash
./build_release.sh
```

This script will automatically:
1. ✅ Build Vue.js frontend (`npm run build`)
2. ✅ Create PyInstaller app bundle
3. ✅ Generate DMG installer
4. ✅ Show build summary

### Windows Build (One-Command)

```cmd
build_release_windows.bat
```

This script will automatically:
1. ✅ Build Vue.js frontend (`npm run build`)
2. ✅ Create Windows icon (.ico)
3. ✅ Create PyInstaller executable
4. ✅ Generate ZIP archive
5. ✅ Show build summary

---

## Manual Build Process

### macOS

If you prefer to run each step manually:

#### Step 1: Build Frontend
```bash
cd frontend
npm run build
```

#### Step 2: Build PyInstaller Bundle
```bash
cd backend
pyenv local 3.10.13
pyinstaller --clean --distpath ../dist --workpath build timekeeper.spec
```

#### Step 3: Create DMG
```bash
cd backend
./create_dmg.sh
```

### Windows

#### Step 1: Build Frontend
```cmd
cd frontend
npm run build
```

#### Step 2: Create Windows Icon
```cmd
cd icons
python create_ico.py
```

#### Step 3: Build PyInstaller Executable
```cmd
cd backend
pyinstaller --clean --distpath ../dist --workpath build timekeeper-windows.spec
```

#### Step 4: Create ZIP Archive
```cmd
cd dist
powershell -Command "Compress-Archive -Path TimekeeperPayroll\* -DestinationPath TimekeeperPayroll-Windows.zip -Force"
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

### macOS

After successful build, you'll find:

```
dist/
├── Timekeeper Payroll.app      # macOS app bundle
└── TimekeeperPayroll-v2.0.0.dmg # DMG installer
```

### Windows

After successful build, you'll find:

```
dist/
├── TimekeeperPayroll/          # Executable folder
│   ├── TimekeeperPayroll.exe  # Main executable
│   ├── frontend/              # Built Vue.js app
│   └── [PyQt6 and Python runtime files]
└── TimekeeperPayroll-Windows.zip # ZIP archive for distribution
```

All build artifacts are in the **project root `dist/` directory**, not `backend/dist/`.

---

## Testing the Build

### macOS

**Test the App Bundle**
```bash
open "dist/Timekeeper Payroll.app"
```

**Test the DMG**
1. Double-click `TimekeeperPayroll-v2.0.0.dmg`
2. Drag app to Applications folder
3. Eject the DMG volume
4. Launch from Applications

### Windows

**Test the Executable**
```cmd
dist\TimekeeperPayroll\TimekeeperPayroll.exe
```

**Test the ZIP Archive**
1. Extract `TimekeeperPayroll-Windows.zip` to a new folder
2. Run `TimekeeperPayroll.exe`
3. Verify all features work (camera, database, API calls)

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

## GitHub Actions - Automated Builds

The repository includes automated build workflows that trigger on version tags.

### Creating a Release

1. **Commit all changes**
   ```bash
   git add .
   git commit -m "Release v2.0.2"
   git push origin main
   ```

2. **Create and push version tag**
   ```bash
   git tag v2.0.2
   git push origin v2.0.2
   ```

3. **GitHub Actions automatically:**
   - Builds macOS DMG (on `macos-latest` runner)
   - Builds Windows ZIP (on `windows-latest` runner)
   - Creates GitHub Release with both artifacts
   - Generates release notes

4. **Download artifacts from:**
   ```
   https://github.com/[username]/[repo]/releases/tag/v2.0.2
   ```

### Build Workflow

Both macOS and Windows builds run in parallel:

```
Tag pushed (v2.0.2)
    ├─> macOS Build Job
    │   ├─ Install Node.js & Python
    │   ├─ Build frontend
    │   ├─ Build PyInstaller app
    │   ├─ Create DMG
    │   └─ Upload to Release
    │
    └─> Windows Build Job
        ├─ Install Node.js & Python
        ├─ Build frontend
        ├─ Create .ico icon
        ├─ Build PyInstaller .exe
        ├─ Create ZIP archive
        └─ Upload to Release
```

### Monitoring Builds

View build progress at:
```
https://github.com/[username]/[repo]/actions
```

---

## Distribution

After building (locally or via GitHub Actions):

1. **Test thoroughly** on your machine
2. **Test on a clean machine** if possible
3. **Sign the app** (optional, requires Apple Developer account for macOS)
4. **Notarize** (optional, for macOS Gatekeeper)
5. **Upload to distribution server** or use GitHub Releases
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
