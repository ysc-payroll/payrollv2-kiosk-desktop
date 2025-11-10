# Windows Build Setup - Summary

## What Was Added

Windows build support has been fully integrated into the Timekeeper Payroll project. Now you can create distributable Windows executables alongside macOS DMG files.

## New Files Created

### 1. `backend/timekeeper-windows.spec`
PyInstaller specification file for Windows builds. Key differences from macOS version:
- Uses `.ico` icon instead of `.icns`
- No macOS BUNDLE section
- Outputs `TimekeeperPayroll.exe` instead of `.app`

### 2. `build_release_windows.bat`
One-command build script for Windows (equivalent to `build_release.sh` for macOS):
```cmd
build_release_windows.bat
```

Steps performed:
1. Install frontend dependencies
2. Build Vue.js frontend
3. Create Windows icon (.ico)
4. Install backend dependencies
5. Build Windows executable with PyInstaller
6. Create ZIP archive for distribution

### 3. `icons/create_ico.py`
Python script to convert PNG to Windows ICO format:
- Converts `icon_1024x1024.png` → `icon.ico`
- Creates multiple sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- Automatically run during Windows builds

### 4. Updated `.github/workflows/build-release.yml`
GitHub Actions workflow now builds for **both platforms in parallel**:

**Before**: macOS only
**After**: macOS + Windows

When you push a version tag (e.g., `v2.0.2`):
- macOS job creates DMG
- Windows job creates ZIP
- Both uploaded to same GitHub Release

## How to Use

### Local Windows Build

**Prerequisites:**
- Windows 10/11
- Python 3.10 installed
- Node.js 20 installed
- Git

**Build Command:**
```cmd
cd C:\path\to\timekeeper-payroll-v2
build_release_windows.bat
```

**Output:**
```
dist/
├── TimekeeperPayroll/
│   └── TimekeeperPayroll.exe
└── TimekeeperPayroll-Windows.zip
```

### Automated GitHub Build

**Trigger build for both platforms:**

```bash
# 1. Commit changes
git add .
git commit -m "Release v2.0.2"
git push origin main

# 2. Create version tag
git tag v2.0.2
git push origin v2.0.2
```

**GitHub Actions will:**
1. Build macOS DMG (~15-20 minutes)
2. Build Windows ZIP (~15-20 minutes) - **runs in parallel**
3. Create GitHub Release with both files
4. Generate release notes

**Download from:**
```
https://github.com/ysc-payroll/payrollv2-kiosk-desktop/releases/tag/v2.0.2
```

## Build Artifacts

### macOS
- **File**: `TimekeeperPayroll-v2.0.2.dmg`
- **Size**: ~200-250 MB (compressed)
- **Format**: Disk image installer
- **Installation**: Drag to Applications folder

### Windows
- **File**: `TimekeeperPayroll-v2.0.2-Windows.zip`
- **Size**: ~300-400 MB (compressed)
- **Format**: ZIP archive
- **Installation**: Extract and run `TimekeeperPayroll.exe`

## Testing Windows Build

### Quick Test
```cmd
dist\TimekeeperPayroll\TimekeeperPayroll.exe
```

### Full Test
1. Extract ZIP to a fresh location (simulate user installation)
2. Run `TimekeeperPayroll.exe`
3. Test all features:
   - Camera access
   - Face registration
   - Clock in/out
   - Overtime/Leave requests
   - API connectivity
   - Database creation

## Differences: macOS vs Windows

| Feature | macOS | Windows |
|---------|-------|---------|
| **Icon** | .icns | .ico |
| **Package** | .app bundle | Folder with .exe |
| **Installer** | DMG | ZIP |
| **PyInstaller Spec** | `timekeeper.spec` | `timekeeper-windows.spec` |
| **Build Script** | `build_release.sh` | `build_release_windows.bat` |
| **Database Location** | `~/Library/Application Support/` | `%APPDATA%/Timekeeper Payroll/` |

## Known Considerations

### Windows-Specific

1. **Antivirus/Windows Defender**
   - Unsigned executables may trigger SmartScreen warnings
   - Users need to click "More info" → "Run anyway"
   - Consider code signing for production distribution

2. **Camera Permissions**
   - Windows 10/11 requires camera permissions in Settings
   - App will prompt for access on first use

3. **File Size**
   - Windows builds are larger due to PyQt6 + QtWebEngine
   - Typical size: 350-450 MB uncompressed

4. **Python Runtime**
   - Fully embedded, users don't need Python installed
   - Uses Python 3.10 embedded runtime

### Future Improvements

- [ ] Add code signing for Windows (requires certificate)
- [ ] Create proper installer with Inno Setup or WiX
- [ ] Add auto-update mechanism
- [ ] Reduce bundle size with custom QtWebEngine build
- [ ] Add Windows-specific optimizations

## Troubleshooting

### Build Fails on Windows

**Problem**: Missing dependencies

**Solution**:
```cmd
pip install --upgrade pip
pip install -r backend/requirements.txt
pip install pyinstaller
```

### Camera Not Working on Windows

**Problem**: Camera permissions not granted

**Solution**:
1. Open Windows Settings
2. Privacy → Camera
3. Enable "Allow apps to access your camera"
4. Ensure "Timekeeper Payroll" has access

### App Won't Start

**Problem**: Missing Visual C++ Redistributables

**Solution**:
- Download and install: [Microsoft Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)

## Next Steps

The v2.0.1 release is currently building with:
- ✅ macOS DMG
- ✅ Windows ZIP (new!)

Once the GitHub Actions workflow completes (~20-30 minutes), you'll have both installers available at:
```
https://github.com/ysc-payroll/payrollv2-kiosk-desktop/releases/tag/v2.0.1
```

Test the Windows build on a Windows machine and verify all features work correctly.

---

**Created**: November 10, 2025
**Version**: 2.0.1
