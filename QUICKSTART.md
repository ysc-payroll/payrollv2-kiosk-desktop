# Quick Start Guide

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- Webcam/camera access

## First Time Setup

### 1. Test the Database

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
pip install -r requirements.txt
python test_database.py
```

You should see "All tests passed! ✓"

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

## Running the Application

### Development Mode (Recommended)

Use the provided script that starts both dev server and PyQt app:

```bash
./run_dev.sh
```

Or manually:

**Terminal 1:**
```bash
cd frontend
npm run dev
```

**Terminal 2:**
```bash
cd backend
source venv/bin/activate
python main.py
```

### Production Mode

```bash
./run_production.sh
```

This builds the frontend and launches the PyQt application.

## Using the Kiosk

1. **Allow Camera Access** when prompted
2. **Enter Employee ID** using the numeric keypad
3. **Click IN** to clock in or **OUT** to clock out
4. Photo is captured automatically
5. Toast notification confirms success
6. Screen resets for next employee

## Testing Without PyQt (Browser Only)

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser. The app runs in "browser mode" and logs to console.

## Keyboard Shortcuts

- **ESC**: Exit fullscreen (development mode)

## Verifying Data

Check the database:

```bash
sqlite3 backend/database/kiosk.db "SELECT * FROM kiosk_logs;"
```

Check photos:

```bash
ls backend/database/photos/
```

## Troubleshooting

**Camera not working?**
- Grant camera permissions
- Check if camera is in use by another app

**Can't connect to dev server?**
- Make sure Vite dev server is running on port 5173
- Check console for errors

**PyQt installation issues?**
- Try: `pip install --upgrade pip`
- Then: `pip install PyQt6 PyQt6-WebEngine`

## Next Steps

See [README.md](README.md) for detailed documentation and Phase 2 roadmap.
