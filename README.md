# Timekeeper Payroll v2.0

Desktop kiosk application for employee time tracking, overtime requests, leave management, and payroll integration.

## Overview

Timekeeper Payroll is a cross-platform desktop application built with PyQt6 and Vue.js. It provides a kiosk-style interface for employees to:

- Clock in/out with facial recognition
- Submit overtime requests
- File leave applications
- View personal timesheet records
- Access company announcements

The application runs offline-first with local SQLite storage and syncs with a cloud backend API.

## Technology Stack

- **Desktop Runtime**: Python 3.10+ with PyQt6
- **Frontend**: Vue.js 3 + Vite + TailwindCSS
- **Local Database**: SQLite
- **Camera/Facial Recognition**: WebRTC + face-api.js
- **API Communication**: REST API with custom authentication headers
- **Packaging**: PyInstaller (macOS .app bundle and .dmg installer)

## Quick Start

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- Webcam/camera access

### Installation

1. **Backend Setup**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
# or: venv\Scripts\activate on Windows
pip install -r requirements.txt
```

2. **Frontend Setup**
```bash
cd frontend
npm install
```

### Running in Development Mode

**Option 1: Using the dev script**
```bash
./run_dev.sh
```

**Option 2: Manual (two terminals)**

Terminal 1 - Frontend dev server:
```bash
cd frontend
npm run dev
```

Terminal 2 - PyQt application:
```bash
cd backend
source venv/bin/activate
python main.py
```

The app will open in fullscreen kiosk mode and load the Vue.js frontend from http://localhost:8765 (local HTTP server).

### Building for Production

1. **Build the frontend**
```bash
cd frontend
npm run build
```

2. **Build the PyQt application**
```bash
cd backend
pyinstaller timekeeper.spec
```

This creates `dist/Timekeeper Payroll.app` on macOS.

3. **Create DMG installer (macOS only)**
```bash
./create_dmg.sh
```

This creates `dist/TimekeeperPayroll-v2.0.0.dmg` (approximately 197MB).

## Project Structure

```
timekeeper-payroll-v2/
├── backend/
│   ├── main.py              # PyQt6 application entry point
│   ├── bridge.py            # Python-JavaScript bridge (QWebChannel)
│   ├── database.py          # SQLite database operations
│   ├── timekeeper.spec      # PyInstaller build configuration
│   ├── requirements.txt     # Python dependencies
│   └── database/            # SQLite database and stored photos
├── frontend/
│   ├── src/
│   │   ├── App.vue          # Main application component
│   │   ├── router.js        # Vue Router configuration
│   │   ├── services/
│   │   │   └── api.js       # API service with authentication
│   │   ├── views/           # Main application screens
│   │   └── components/      # Reusable Vue components
│   ├── dist/                # Built frontend (after npm run build)
│   └── package.json
├── icons/
│   └── icon.icns           # Application icon for macOS
└── create_dmg.sh           # Script to create DMG installer
```

## Key Features

### Implemented
- ✅ Employee clock in/out with facial recognition
- ✅ Photo capture and storage
- ✅ Offline-first local database
- ✅ Overtime request submission
- ✅ Leave application filing
- ✅ Personal timesheet viewing
- ✅ Company announcements
- ✅ Employee sync from cloud API
- ✅ Fullscreen kiosk mode
- ✅ Cloud API integration with custom authentication

### Security Features
- Custom authentication headers (X-Timekeeper-Desktop, X-App-Version, X-App-Secret)
- CORS-compliant API communication via localhost HTTP server
- Secure token-based authentication
- Camera permissions handling

## Configuration

### API Endpoint
The application connects to: `https://api.theabbapayroll.com`

To change the API endpoint, edit:
```javascript
// frontend/src/services/api.js
const BASE_URL = 'https://api.theabbapayroll.com'
```

### Custom Headers
The app sends these custom headers for authentication:
- `X-Timekeeper-Desktop: true`
- `X-App-Version: 2.0.0`
- `X-App-Secret: [secret-token]`

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted in System Preferences > Security & Privacy
- Check if another app is using the camera
- Reset permissions: `tccutil reset Camera "com.theabba.timekeeper-payroll"`

### CORS Errors
- Ensure backend server has `http://localhost:8765` in CORS allowed origins
- Check that the local HTTP server is running (started automatically by main.py)

### Build Issues
- Clear old builds: `rm -rf backend/dist backend/build`
- Rebuild frontend: `cd frontend && rm -rf dist && npm run build`
- Verify PyInstaller spec file includes all resources

### App Won't Launch
- Check for port conflicts (port 8765 must be available)
- View debug logs at: `~/Desktop/timekeeper_debug.log`
- Run with console: change `console=False` to `console=True` in timekeeper.spec

## Keyboard Shortcuts (Development)

- **F12**: Open Developer Tools
- **ESC**: Exit fullscreen / Close application

## Distribution

The built `.dmg` installer can be distributed to end users. They simply:
1. Open the DMG file
2. Drag "Timekeeper Payroll.app" to Applications folder
3. Launch the app
4. Grant camera permissions when prompted

## Support

For technical issues or questions, refer to DEVELOPMENT.md for detailed technical documentation.

## License

Internal use only - All rights reserved
