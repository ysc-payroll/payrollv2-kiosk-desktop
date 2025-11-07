# Development Documentation

Technical documentation for developers working on Timekeeper Payroll v2.0.

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   PyQt6 Application                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │          QWebEngineView (Chromium)                │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │   Vue.js Frontend (http://localhost:8765)   │  │  │
│  │  │   ┌─────────────────────────────────────┐   │  │  │
│  │  │   │  - Router (views/components)        │   │  │  │
│  │  │   │  - API Service (AJAX calls)         │   │  │  │
│  │  │   │  - Camera/Face Recognition          │   │  │  │
│  │  │   └─────────────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                      ↕ QWebChannel                 │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │   Python Bridge (bridge.py)                 │  │  │
│  │  │   - saveLog(), syncToAPI(), etc.            │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↕                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │   Local HTTP Server (Python http.server)         │  │
│  │   Serves: frontend/dist/* on localhost:8765      │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↕                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │   SQLite Database (database/kiosk.db)            │  │
│  │   - kiosk_logs, employees, overtime, leaves      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTPS
        ┌──────────────────────────────────────┐
        │  Cloud API (api.theabbapayroll.com)  │
        │  - Django REST Framework + CORS      │
        └──────────────────────────────────────┘
```

### Key Technical Decisions

#### 1. Why Local HTTP Server (localhost:8765)?

**Problem**: PyQt6's QWebEngineView using `file://` protocol doesn't send `Origin` header consistently in POST requests, causing CORS failures.

**Solution**: Embedded Python HTTP server serves the Vue.js frontend from `http://localhost:8765`, ensuring proper Origin header behavior.

**Implementation**:
- `main.py:53-87` - `start_local_server()` function
- Uses `http.server.HTTPServer` with daemon thread
- Automatically started when app launches
- Port 8765 chosen to avoid conflicts with common dev servers

**Security**: localhost:8765 is only accessible from the local machine, not from the internet.

#### 2. PyQt6 + Vue.js Integration

**Why not Electron?**
- Smaller bundle size with PyQt6
- Better Python ecosystem integration
- Native system access for future features (fingerprint readers, etc.)

**Communication**: QWebChannel provides bidirectional Python ↔ JavaScript bridge

#### 3. Offline-First Design

All data is stored locally in SQLite first, then synced to cloud API when online. This ensures:
- App works without internet
- No data loss during network outages
- Fast response times for user interactions

## File Structure Deep Dive

### Backend Files

#### `main.py` (332 lines)
Main application entry point. Key sections:

- **Lines 41-87**: Local HTTP server setup
  - `LocalHTTPRequestHandler` - Custom handler with logging
  - `start_local_server()` - Starts server on daemon thread

- **Lines 89-303**: KioskWindow class
  - `init_ui()` - WebEngine setup, cache disabled for dev
  - `load_frontend()` - Detects PyInstaller bundle vs dev mode
  - `setup_bridge()` - Registers Python bridge for JS access
  - `create_menu_bar()` - File/View/Window/Help menus
  - Camera permission handling (lines 160-173)

- **Lines 305-328**: Application entry point
  - Creates QApplication
  - Instantiates KioskWindow
  - Enters Qt event loop

**Development Notes**:
- Cache is disabled (line 135) to force JS reload during development
- Console messages are logged (line 143)
- Developer tools available via F12 (lines 264-277)

#### `bridge.py`
Python-JavaScript bridge using QWebChannel.

Key methods exposed to JavaScript:
- `saveLog(employee_id, action, photo_data)` - Save clock in/out
- `syncToAPI()` - Sync pending logs to cloud
- `getRecentLogs()` - Fetch recent entries
- `saveOvertimeRequest(data)` - Submit overtime
- `saveLeaveRequest(data)` - Submit leave application

Called from JavaScript via:
```javascript
window.kioskBridge.saveLog(employeeId, action, photoData, callback)
```

#### `database.py`
SQLite database operations.

Tables:
- `kiosk_logs` - Clock in/out records
- `employees` - Cached employee data
- `overtime_requests` - OT submissions
- `leave_requests` - Leave applications

All timestamps stored in UTC, converted to local time in UI.

#### `timekeeper.spec`
PyInstaller build configuration.

Key settings:
- **Lines 39-46**: Data files to bundle
  - `frontend/dist` → bundled frontend
  - `database` → included but user data goes to separate location
  - QtWebEngine resources (lines 14-32)

- **Line 77**: `console=False` - No terminal window in production
- **Line 83**: Icon file for macOS
- **Lines 102-112**: macOS .app bundle metadata
  - Bundle ID: `com.theabba.timekeeper-payroll`
  - Camera/microphone permission descriptions

**Build Process**:
1. Frontend must be built first: `npm run build`
2. Run PyInstaller: `pyinstaller timekeeper.spec`
3. Output: `dist/Timekeeper Payroll.app`

### Frontend Files

#### `src/services/api.js` (150+ lines)
Centralized API service with authentication.

**Base URL**: `https://api.theabbapayroll.com`

**Custom Headers** (lines 71-75):
```javascript
headers['X-Timekeeper-Desktop'] = 'true'
headers['X-App-Version'] = '2.0.0'
headers['X-App-Secret'] = '[secret-token]'
```

**Key Functions**:
- `login(username, password)` - User authentication
- `getEmployees()` - Fetch employee list
- `getTimesheetLogs(params)` - Get timesheet data
- `submitOvertimeRequest(data)` - Submit OT
- `submitLeaveRequest(data)` - Submit leave

**Error Handling**:
- Network errors logged and thrown
- 401/403 → redirect to login
- CORS errors → check backend CORS config

**Development Notes**:
- Origin header is set automatically by browser (not manually)
- Credentials included for session cookies
- All requests go through this single service for consistency

#### `src/router.js`
Vue Router configuration.

Routes:
- `/` - Home/Clock In screen
- `/login` - Admin login
- `/overtime` - Overtime request form
- `/leave` - Leave application form
- `/timesheet` - Personal timesheet view
- `/announcements` - Company announcements

Navigation guards check authentication state.

#### `src/views/`
Main application screens:

- `HomeView.vue` - Clock in/out with facial recognition
- `LoginView.vue` - Admin authentication
- `OvertimeView.vue` - OT request form with validation
- `LeaveView.vue` - Leave application form
- `TimesheetView.vue` - Personal timesheet with filtering
- `AnnouncementsView.vue` - Company-wide announcements

#### `src/components/`
Reusable components:

- `CameraView.vue` - WebRTC camera with face detection
- `NumericKeypad.vue` - Touch-friendly number input
- `ToastNotification.vue` - Success/error messages
- `NavigationBar.vue` - Top navigation
- `EmployeeCard.vue` - Employee info display

## Database Schema

### `kiosk_logs`
```sql
CREATE TABLE kiosk_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    action TEXT NOT NULL,           -- 'IN' or 'OUT'
    timestamp DATETIME NOT NULL,    -- UTC
    photo_path TEXT,                -- Path to captured photo
    synced BOOLEAN DEFAULT 0,       -- 0 = pending, 1 = synced
    sync_timestamp DATETIME,        -- When synced to API
    api_response TEXT               -- JSON response from API
);
```

### `employees`
```sql
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    department TEXT,
    position TEXT,
    photo_url TEXT,
    active BOOLEAN DEFAULT 1,
    last_synced DATETIME
);
```

### `overtime_requests`
```sql
CREATE TABLE overtime_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    date DATE NOT NULL,
    hours REAL NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',  -- pending, approved, rejected
    submitted_at DATETIME NOT NULL,
    synced BOOLEAN DEFAULT 0
);
```

### `leave_requests`
```sql
CREATE TABLE leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    leave_type TEXT NOT NULL,       -- sick, vacation, emergency
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    submitted_at DATETIME NOT NULL,
    synced BOOLEAN DEFAULT 0
);
```

## API Integration

### Authentication Flow

1. **Desktop App Identification**
   - Custom headers identify legitimate desktop app requests
   - Backend validates `X-App-Secret` header
   - Additional `X-Timekeeper-Desktop` and `X-App-Version` for tracking

2. **User Login** (for admin features)
   ```javascript
   POST /api/auth/login/
   Body: { username, password }
   Response: { token, user: {...} }
   ```
   - Token stored in localStorage
   - Included in subsequent requests via Authorization header

3. **Token Refresh**
   - Tokens expire after 24 hours
   - Auto-refresh implemented in api.js

### CORS Configuration

**Backend (Django settings.py)**:
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:8765',
    'http://127.0.0.1:8765',
]

CORS_ALLOW_CREDENTIALS = True
```

**Why localhost in CORS origins?**
- Required because frontend is served from http://localhost:8765
- Not a security risk - localhost only accessible from local machine
- Custom headers (X-App-Secret) provide additional authentication layer

### API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login/` | POST | User authentication |
| `/api/employees/` | GET | Fetch employee list |
| `/api/employees/sync/` | POST | Sync employee data |
| `/api/timesheets/logs/` | GET, POST | Timesheet operations |
| `/api/overtime/requests/` | GET, POST | Overtime requests |
| `/api/leave/requests/` | GET, POST | Leave applications |
| `/api/announcements/` | GET | Company announcements |

## Build Process

### Development Build

```bash
# Frontend hot-reload
cd frontend
npm run dev

# Python app (loads from Vite dev server)
cd backend
source venv/bin/activate
python main.py
```

### Production Build

```bash
# 1. Build frontend
cd frontend
npm run build
# Output: frontend/dist/

# 2. Build PyQt app
cd backend
pyinstaller timekeeper.spec
# Output: dist/Timekeeper Payroll.app

# 3. Create DMG installer
./create_dmg.sh
# Output: dist/TimekeeperPayroll-v2.0.0.dmg
```

### What Gets Bundled

**PyInstaller bundles**:
- Python interpreter + PyQt6 libraries
- `frontend/dist/` (built Vue.js app)
- `database/` folder (empty, for schema reference)
- QtWebEngine helper process
- QtWebEngine resources (Chromium)

**Total size**: ~197MB (mostly QtWebEngine/Chromium)

**Not bundled** (created at runtime):
- User database at runtime location
- Employee photos
- Debug logs

## Security Considerations

### 1. Custom App Secret

**Location**: `frontend/src/services/api.js:75`
```javascript
headers['X-App-Secret'] = '0PyX2b4ATZ8A73BDbfU6QENRant-pBylVML6QO6fBc0'
```

**Purpose**: Identifies legitimate desktop app requests

**Rotation**: Change token every 6-12 months
- Generate new token: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- Update in api.js
- Set as environment variable in backend: `DESKTOP_APP_SECRET`
- Deploy backend changes
- Rebuild and redistribute desktop app

### 2. Camera Permissions

**macOS**: Requires camera permission declarations
- Defined in `timekeeper.spec:109-110`
- User prompted on first camera access
- Can be reset: `tccutil reset Camera "com.theabba.timekeeper-payroll"`

### 3. CORS Security

**Not vulnerable** because:
- localhost:8765 only accessible locally
- Custom headers validate legitimate requests
- Backend can optionally validate X-App-Secret
- HTTPS used for all API communication

### 4. Photo Storage

**Current**: Photos stored locally in `database/photos/`

**Considerations**:
- Photos contain sensitive biometric data
- Local storage only (not synced to cloud in current version)
- File permissions should restrict access
- Consider encryption for future versions

## Common Issues & Solutions

### Issue: CORS Error After Deployment

**Symptoms**:
```
Access to fetch blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

**Cause**: Backend CORS settings not deployed to production

**Solution**:
1. Verify `settings.py` includes `http://localhost:8765` in CORS_ALLOWED_ORIGINS
2. Deploy backend changes to production
3. Restart backend server

### Issue: Camera Not Working

**Symptoms**: Black screen instead of camera preview

**Causes**:
1. Camera permissions not granted
2. Another app using camera
3. Camera disabled in hardware

**Solutions**:
1. Check System Preferences > Security & Privacy > Camera
2. Close other apps using camera (Zoom, Skype, etc.)
3. Reset permissions: `tccutil reset Camera "com.theabba.timekeeper-payroll"`

### Issue: App Won't Launch After Build

**Symptoms**: App opens then immediately closes

**Debugging**:
1. Enable console output in `timekeeper.spec:77` → `console=True`
2. Rebuild and check terminal output
3. Check Desktop for `timekeeper_debug.log`

**Common causes**:
- Missing frontend/dist folder
- QtWebEngine resources not bundled
- Port 8765 already in use

### Issue: Face Recognition Not Working

**Symptoms**: Photos captured but no face detection boxes

**Solutions**:
1. Check internet connection (face-api.js models load from CDN)
2. Verify models loaded: Check browser console (F12)
3. Ensure good lighting for face detection
4. Check camera quality (minimum 720p recommended)

## Environment-Specific Configuration

### Development
- Frontend: Vite dev server (http://localhost:5173)
- Backend: Points to dev server if `frontend/dist` doesn't exist
- Database: `backend/database/kiosk.db`
- Logs: Console + `~/Desktop/timekeeper_debug.log`
- Cache: Disabled for hot-reload

### Production (Built .app)
- Frontend: Served from bundled `frontend/dist` via localhost:8765
- Backend: Loads from `sys._MEIPASS` (PyInstaller temp folder)
- Database: Created in app's runtime directory
- Logs: `~/Desktop/timekeeper_debug.log`
- Cache: Disabled (line 135 in main.py)

### Production (Deployed to Users)
- Same as above
- No terminal output (console=False)
- Users can't access developer tools easily
- Camera permissions must be granted by user

## Performance Optimization

### Frontend
- Vue.js production build (minified)
- TailwindCSS purged (unused styles removed)
- face-api.js models lazy-loaded
- Images optimized (photos compressed before save)

### Backend
- SQLite with indexes on frequently queried fields
- Daemon thread for HTTP server (non-blocking)
- Photo compression before storage
- Batch sync for offline logs

### Bundle Size
- Current: ~197MB
- Mostly QtWebEngine (Chromium engine ~150MB)
- Future: Consider custom Chromium build to reduce size

## Testing

### Manual Testing Checklist

**Clock In/Out Flow**:
- [ ] Camera preview appears
- [ ] Face detection boxes appear
- [ ] Employee ID input works
- [ ] IN button captures photo and saves log
- [ ] OUT button captures photo and saves log
- [ ] Toast notification appears
- [ ] Input clears after submission
- [ ] Database entry created
- [ ] Photo saved to database/photos/

**Overtime Request**:
- [ ] Form validation works
- [ ] Date picker functional
- [ ] Hours input validated (0-24)
- [ ] Submission saves to local DB
- [ ] Sync to API works when online

**Leave Request**:
- [ ] Leave type dropdown works
- [ ] Date range picker functional
- [ ] Date validation (end >= start)
- [ ] Reason field saves correctly
- [ ] Submission works offline

**Navigation**:
- [ ] All routes accessible
- [ ] Back navigation works
- [ ] Auth guards protect admin routes
- [ ] Logout clears session

### Automated Testing (Future)

Currently no automated tests. Recommended additions:
- Unit tests for database.py functions
- Integration tests for bridge.py
- Vue component tests (Vitest)
- E2E tests (Playwright)

## Future Enhancements

### Planned Features
- [ ] Fingerprint scanner integration
- [ ] Enhanced face recognition (training mode)
- [ ] Offline queue management UI
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Admin dashboard (built-in)
- [ ] Export timesheet to PDF
- [ ] Email notifications
- [ ] Biometric template sync

### Technical Debt
- [ ] Add automated tests
- [ ] Reduce bundle size
- [ ] Implement proper logging framework
- [ ] Add crash reporting
- [ ] Encrypt photo storage
- [ ] Code signing for macOS distribution
- [ ] Auto-update mechanism

## Contributing Guidelines

### Code Style
- Python: Follow PEP 8
- JavaScript: ESLint + Prettier (configured in frontend)
- Vue: Follow Vue.js style guide

### Git Workflow
- Main branch: production-ready code
- Feature branches: `feature/feature-name`
- Bug fixes: `fix/bug-description`
- Commit messages: Conventional Commits format

### Pull Request Process
1. Create feature branch
2. Implement changes
3. Test thoroughly
4. Update documentation if needed
5. Submit PR with description
6. Code review
7. Merge after approval

## Resources

### Documentation
- PyQt6: https://doc.qt.io/qtforpython-6/
- Vue.js 3: https://vuejs.org/guide/
- QWebChannel: https://doc.qt.io/qt-6/qwebchannel.html
- PyInstaller: https://pyinstaller.org/en/stable/

### Tools
- Qt Creator: GUI design tool
- Vue DevTools: Browser extension for debugging
- DB Browser for SQLite: Database inspection

### Dependencies
- See `backend/requirements.txt` for Python packages
- See `frontend/package.json` for npm packages

---

Last updated: 2025-11-07
