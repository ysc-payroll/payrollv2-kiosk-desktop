@echo off
REM Windows Build Script for Timekeeper Payroll
REM Run this on a Windows machine to create a distributable build

echo ========================================
echo Timekeeper Payroll - Windows Build
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "frontend\package.json" (
    echo Error: Must run from project root directory
    exit /b 1
)

echo Step 1: Installing frontend dependencies...
cd frontend
call npm ci
if errorlevel 1 (
    echo Error: Frontend dependency installation failed
    exit /b 1
)
echo.

echo Step 2: Building frontend...
call npm run build
if errorlevel 1 (
    echo Error: Frontend build failed
    exit /b 1
)
cd ..
echo.

echo Step 3: Creating Windows icon...
cd icons
python -m pip install pillow
python create_ico.py
if errorlevel 1 (
    echo Warning: Icon creation failed, continuing anyway...
)
cd ..
echo.

echo Step 4: Installing backend dependencies...
cd backend
python -m pip install --upgrade pip
pip install pyinstaller
pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Backend dependency installation failed
    exit /b 1
)
echo.

echo Step 5: Building Windows executable with PyInstaller...
pyinstaller --clean --distpath ../dist --workpath build timekeeper-windows.spec
if errorlevel 1 (
    echo Error: PyInstaller build failed
    exit /b 1
)
cd ..
echo.

echo Step 6: Creating ZIP archive...
cd dist
powershell -Command "Compress-Archive -Path TimekeeperPayroll\* -DestinationPath TimekeeperPayroll-Windows.zip -Force"
if errorlevel 1 (
    echo Error: ZIP creation failed
    exit /b 1
)
cd ..
echo.

echo ========================================
echo Build complete!
echo ========================================
echo Output: dist\TimekeeperPayroll-Windows.zip
echo.
echo To run the app: dist\TimekeeperPayroll\TimekeeperPayroll.exe
echo.
