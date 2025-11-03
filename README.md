# Timekeeper Kiosk Application - Phase 1 MVP

Employee Self-Service (ESS) Kiosk application for Time IN/OUT with automatic photo capture.

## Technology Stack

- **Backend**: Python 3.10+ with PyQt6
- **Frontend**: Vue.js 3 + Vite + TailwindCSS
- **Database**: SQLite (local storage)
- **Camera**: WebRTC (getUserMedia API)
- **Architecture**: Monorepo with PyQt WebView hosting Vue.js frontend

## Project Structure

```
timekeeper-payroll-v2/
├── backend/
│   ├── main.py           # PyQt6 application entry point
│   ├── database.py       # SQLite operations
│   ├── bridge.py         # Python-JS bridge (QWebChannel)
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.vue                      # Main kiosk screen
│   │   ├── components/
│   │   │   ├── CameraView.vue          # WebRTC camera
│   │   │   ├── NumericKeypad.vue       # Input keypad
│   │   │   └── ToastNotification.vue   # Notifications
│   │   └── style.css                    # TailwindCSS
│   ├── package.json
│   └── vite.config.js
└── database/             # SQLite database and photos
    ├── kiosk.db
    └── photos/
```

## Setup Instructions

### 1. Backend Setup (Python)

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup (Vue.js)

```bash
cd frontend

# Install dependencies (already done if you ran npm install earlier)
npm install

# Build for production
npm run build
```

## Running the Application

### Option 1: Development Mode (Recommended for testing)

**Terminal 1 - Frontend Dev Server:**
```bash
cd frontend
npm run dev
```
This starts Vite dev server at http://localhost:5173

**Terminal 2 - Python Application:**
```bash
cd backend
source venv/bin/activate  # Activate virtual environment
python main.py
```

The PyQt window will load the Vue.js app from the dev server.

### Option 2: Production Mode

```bash
# Build frontend first
cd frontend
npm run build

# Run Python application
cd ../backend
source venv/bin/activate
python main.py
```

The PyQt window will load the built Vue.js app from `frontend/dist/`.

## Testing the Application

### Basic Functionality Test

1. **Camera Check**
   - Camera preview should appear at the top of the screen
   - Allow camera permissions when prompted

2. **Employee ID Input**
   - Click numbers on the keypad
   - Verify input appears in the text field
   - Test backspace (←) and clear (CLR) buttons

3. **Clock IN**
   - Enter employee ID (e.g., "12345")
   - Click "IN" button
   - Photo is captured automatically
   - Success toast appears
   - Input field clears

4. **Clock OUT**
   - Enter employee ID
   - Click "OUT" button
   - Verify same behavior as Clock IN

5. **Database Verification**
   - Check that `database/kiosk.db` was created
   - Check that photos are saved in `database/photos/`
   - You can inspect the database with SQLite browser or command:
     ```bash
     sqlite3 database/kiosk.db "SELECT * FROM kiosk_logs;"
     ```

### Browser Testing (Without PyQt)

You can test the frontend independently:

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser. The app will run in "browser mode" and simulate database operations in the console.

## Phase 1 Features Delivered

✅ Time IN/OUT functionality
✅ Live camera preview (WebRTC)
✅ Automatic photo capture
✅ Local SQLite database storage
✅ Toast notifications (success/error)
✅ Numeric keypad input
✅ Offline-first design (no network required)
✅ Fullscreen kiosk mode
✅ Fast throughput (auto-reset after entry)

## Keyboard Shortcuts (Development)

- **ESC**: Exit fullscreen / Close application

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted
- Check if another app is using the camera
- Try reloading the application

### PyQt Bridge Not Connected
- Make sure you're running through PyQt (not just browser)
- Check browser console for "PyQt bridge connected" message
- In browser mode, it will show "Browser mode - simulating success"

### Database Errors
- Check that `database/` directory has write permissions
- Verify SQLite is working: `python -c "import sqlite3; print('OK')"`

### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Python cache: `find . -type d -name __pycache__ -exec rm -r {} +`

## Next Steps (Phase 2+)

- [ ] More Options menu with PIN authentication
- [ ] Overtime/Leave filing forms
- [ ] Recent logs display
- [ ] Holiday announcements
- [ ] Background sync to API server
- [ ] Employee data caching
- [ ] Admin configuration settings

## License

Internal use only - All rights reserved

## Support

For issues or questions, contact the development team.
