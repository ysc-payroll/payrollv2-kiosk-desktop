# Face Data Cloud Sync - Backend API Requirements

**Project:** Timekeeper Payroll v2.0 - Desktop Kiosk Application
**Date:** 2025-01-13
**Purpose:** Enable face recognition data sync across multiple kiosk installations

---

## Business Requirements

### Problem Statement
Clients with multiple kiosk installations (4-6 desktops, 3000+ employees) need face registrations to work across all kiosks:
- **Current:** Face data stored locally only, must register on each kiosk
- **Desired:** Register once on any kiosk, works on all kiosks
- **Use Case 1:** New kiosk installation should download all existing face data
- **Use Case 2:** PC hardware failure - reinstall app, face data restored from cloud
- **Use Case 3:** Employee registers on Kiosk A at 9 AM, clocks in on Kiosk B at 1 PM - should work

### Sync Strategy
- **Storage:** Face encoding only (not photos) - 128-dimensional array, ~2KB per employee
- **Timing:** Immediate upload after registration on desktop app
- **Startup:** Desktop app auto-downloads all face data on launch
- **Conflict Resolution:** Last-updated wins (timestamp comparison)

---

## Database Schema Changes

### Employee Model
**File:** `/apps/employees/models/employee.py`

Add the following fields to the `Employee` model:

```python
class Employee(BaseModel, EmployeeRecordMixin):
    # ... existing fields ...

    # Face Recognition Fields
    face_encoding = models.TextField(
        null=True,
        blank=True,
        help_text="JSON array of 128-dimensional face encoding values from face_recognition library"
    )
    face_registered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when face was registered (for conflict resolution)"
    )
    has_face_registration = models.BooleanField(
        default=False,
        help_text="Quick flag to check if employee has face data without parsing JSON"
    )
```

### Migration
```bash
python manage.py makemigrations employees
python manage.py migrate
```

---

## API Endpoints to Implement

### 1. Upload Face Encoding
**Endpoint:** `POST /api/employees/{employee_id}/face/`

**Purpose:** Desktop app uploads face encoding after successful registration

**Request Headers:**
```
Authorization: Token <user-token>
X-App-Secret: <desktop-app-secret>
X-Timekeeper-Desktop: true
Content-Type: application/json
```

**Request Body:**
```json
{
  "face_encoding": "[0.123, -0.456, 0.789, ..., 0.321]"
}
```
- `face_encoding`: JSON string containing array of 128 float values
- Example length: ~2KB

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "employee_id": 123,
  "registered_at": "2025-01-13T10:30:45.123456Z",
  "message": "Face encoding registered successfully"
}
```

**Response (Error - 400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid face encoding format",
  "detail": "Expected array of 128 float values"
}
```

**Response (Error - 404 Not Found):**
```json
{
  "success": false,
  "error": "Employee not found"
}
```

**Business Logic:**
1. Validate employee exists and belongs to authenticated user's company
2. Validate `face_encoding` is valid JSON array with exactly 128 numeric values
3. Update `Employee` record:
   - `face_encoding` = request body value
   - `face_registered_at` = current timestamp (UTC)
   - `has_face_registration` = True
4. Log audit trail: "Face registered from Desktop Kiosk" (GDPR compliance)
5. Return success response

---

### 2. Delete Face Encoding
**Endpoint:** `DELETE /api/employees/{employee_id}/face/`

**Purpose:** Desktop app removes face registration (user clicked "Clear Face Data")

**Request Headers:**
```
Authorization: Token <user-token>
X-App-Secret: <desktop-app-secret>
X-Timekeeper-Desktop: true
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "employee_id": 123,
  "message": "Face encoding deleted successfully"
}
```

**Response (Error - 404 Not Found):**
```json
{
  "success": false,
  "error": "Employee not found or no face data to delete"
}
```

**Business Logic:**
1. Validate employee exists and belongs to authenticated user's company
2. Update `Employee` record:
   - `face_encoding` = NULL
   - `face_registered_at` = NULL
   - `has_face_registration` = False
3. Log audit trail: "Face data deleted from Desktop Kiosk"
4. Return success response

---

### 3. Fetch Employees with Face Data (Enhanced)
**Endpoint:** `GET /api/employees/timekeeper/?include_faces=true`

**Purpose:** Desktop app downloads all employees WITH face encodings on startup

**Request Headers:**
```
Authorization: Token <user-token>
X-App-Secret: <desktop-app-secret>
X-Timekeeper-Desktop: true
```

**Query Parameters:**
- `include_faces` (optional, default=false): If true, include face_encoding in response

**Response (Success - 200 OK):**
```json
[
  {
    "id": 1,
    "name": "Dela Cruz, Juan",
    "timekeeper_id": "12345",
    "face_encoding": "[0.123, -0.456, ..., 0.321]",
    "face_registered_at": "2025-01-13T10:30:45.123456Z",
    "has_face_registration": true
  },
  {
    "id": 2,
    "name": "Santos, Maria",
    "timekeeper_id": "12346",
    "face_encoding": null,
    "face_registered_at": null,
    "has_face_registration": false
  }
]
```

**Business Logic:**
1. Fetch all active employees for authenticated user's company
2. If `include_faces=true`:
   - Include `face_encoding`, `face_registered_at`, `has_face_registration` in response
   - Only return employees where `deleted_at` IS NULL
3. If `include_faces` not provided or false:
   - Use existing behavior (return minimal fields without face data)
4. Return array of employee objects

**Performance Consideration:**
- For 3000+ employees with face data, response size ~6-8 MB
- Consider pagination if response is too large:
  - `GET /api/employees/timekeeper/?include_faces=true&page=1&page_size=500`

---

## Security & Compliance

### Authentication
- **Required:** Valid user authentication token
- **Required:** `X-App-Secret` header must match `DESKTOP_APP_SECRET` environment variable
- **Validation:** Employee must belong to authenticated user's company

### Data Protection (GDPR/Biometric Data)
Face encodings are biometric data under GDPR and many privacy regulations:

1. **Audit Logging:**
   - Log all face registration uploads (who, when, from where)
   - Log all face data deletions
   - Retain logs per company data retention policy

2. **Data Deletion:**
   - When employee is deleted/resigned: Cascade delete face_encoding
   - Implement right to be forgotten: DELETE endpoint must work

3. **Access Control:**
   - Only authenticated desktop apps can read/write face data
   - No web UI access to raw face encodings (security)

4. **Encryption:**
   - HTTPS in transit (already implemented)
   - Consider encrypting `face_encoding` field at rest in database (optional, recommended)

### Rate Limiting
- Consider rate limiting face upload endpoint to prevent abuse:
  - Max 100 registrations per minute per company
  - Max 10 full syncs per hour per kiosk

---

## Testing Checklist

### Unit Tests
- [ ] Upload valid face encoding → Success
- [ ] Upload invalid JSON → 400 error
- [ ] Upload wrong array length (not 128) → 400 error
- [ ] Upload for non-existent employee → 404 error
- [ ] Upload without authentication → 401 error
- [ ] Upload for employee in different company → 403 error
- [ ] Delete face encoding → Success, fields nullified
- [ ] Delete non-existent face data → 404 error
- [ ] Fetch employees with include_faces=true → Returns face data
- [ ] Fetch employees without include_faces → No face data in response

### Integration Tests
- [ ] Desktop app uploads face encoding → Verify in database
- [ ] Second desktop app fetches employees → Receives uploaded face data
- [ ] Desktop app deletes face encoding → Verify nullified in database
- [ ] Employee deleted → Face encoding also deleted (cascade)

### Performance Tests
- [ ] Fetch 3000 employees with face data → Response time < 5 seconds
- [ ] Upload 100 face encodings concurrently → No database locks
- [ ] Large company (5000+ employees) → Consider pagination

---

## API Documentation Format

Once implemented, please provide documentation in this format:

```markdown
# Face Sync API Documentation

## Base URL
https://api.theabbapayroll.com

## Authentication
All requests require:
- Header: `Authorization: Token <user-token>`
- Header: `X-App-Secret: <desktop-app-secret>`

## Endpoints

### POST /api/employees/{id}/face/
[Request/Response details...]

### DELETE /api/employees/{id}/face/
[Request/Response details...]

### GET /api/employees/timekeeper/?include_faces=true
[Request/Response details...]

## Error Codes
- 400: Invalid request format
- 401: Authentication failed
- 403: Permission denied
- 404: Resource not found
- 500: Server error
```

---

## Desktop App Integration (For Reference)

Once the API is ready, the desktop app will integrate as follows:

### On Face Registration (Desktop)
1. User captures photo and registers face locally
2. Desktop app saves to local SQLite database (existing behavior)
3. **NEW:** Desktop app calls `POST /api/employees/{id}/face/`
4. Show toast: "✅ Face synced to cloud" or "⚠️ Will retry sync later"

### On App Startup (Desktop)
1. Desktop app calls `GET /api/employees/timekeeper/?include_faces=true`
2. For each employee with `has_face_registration=true`:
   - If local DB has no face data: Insert from cloud
   - If local DB has older data (compare `face_registered_at`): Update from cloud
   - If local DB has newer data: Upload to cloud (conflict resolution)
3. Show progress: "Syncing face data... 500/3000 employees"

### On Face Deletion (Desktop)
1. User clicks "Clear Face Data" button
2. Desktop app deletes from local SQLite database
3. **NEW:** Desktop app calls `DELETE /api/employees/{id}/face/`
4. Show toast: "✅ Face data removed from cloud"

---

## Timeline

**Backend Development (Your Team):**
- Database migration: 1 hour
- API endpoints implementation: 4-6 hours
- Testing: 2-3 hours
- Deployment: 1 hour
- **Total: 1-2 days**

**Desktop App Integration (My Team):**
- Will start after API documentation is provided
- Estimated: 6-8 hours development + 4 hours testing

---

## Appendix: Face Encoding Technical Details

### What is a Face Encoding?
- Generated by `face_recognition` Python library (using dlib)
- 128-dimensional array of float values
- Each value typically ranges from -2.0 to +2.0
- Represents unique facial features (distances, angles, proportions)

### Example Face Encoding (truncated):
```json
"[0.123456, -0.234567, 0.345678, -0.456789, 0.567890, ..., 0.123456]"
```
- Total: 128 values
- Storage size: ~2KB as JSON string
- Format: Valid JSON array of numbers

### How Face Recognition Works:
1. Desktop captures photo → Extracts face encoding
2. Compares encoding against all stored encodings
3. Calculates Euclidean distance between vectors
4. Distance < 0.6 = Match (60% confidence threshold)
5. Returns matched employee ID

### Why Store Encoding Only (Not Photos)?
- **Privacy:** Encoding cannot be reverse-engineered to recreate face
- **Size:** Encoding is 2KB vs photo is 100-500KB
- **Performance:** Fast comparison (vector math) vs image processing
- **Legal:** Some jurisdictions have stricter rules for storing biometric photos

---

**End of Document**
