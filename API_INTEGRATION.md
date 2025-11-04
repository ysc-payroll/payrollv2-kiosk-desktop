# API Integration Guide

## Overview

This document describes the API integration between the Timekeeper Kiosk desktop application and the backend API.

## Base URL

```
http://localhost:8000
```

## Features Implemented

### ✅ Authentication
- **JWT-based login** with email/password
- **Automatic token refresh** when access token expires
- **Session persistence** using localStorage
- **Session restoration** on app startup
- **Secure logout** with token blacklisting

### ✅ Employee Sync
- **Automatic sync** after successful login
- **Map API system_id** to local employee_number
- **Update existing employees** or insert new ones
- **Sync status notifications** with toast messages

### ✅ Token Management
- **Access token** stored in localStorage
- **Refresh token** for automatic renewal
- **Token verification** on app startup
- **Automatic retry** on 401 errors

## Authentication Flow

```
1. User enters email/password
   ↓
2. POST /api/auth/login/
   ↓
3. Receive JWT tokens + basic user data
   ↓
4. Store tokens in localStorage
   ↓
5. GET /api/auth/user/
   ↓
6. Receive complete user profile, company, permissions
   ↓
7. Store company data & update database
   ↓
8. Sync employees from API
   ↓
9. Navigate to main kiosk screen
```

## Employee Sync Flow

```
1. After successful login
   ↓
2. GET /api/employees/?limit=1000&is_active=true
   ↓
3. Send employee data to Python bridge
   ↓
4. Bridge syncs to SQLite database:
   - system_id → backend_id
   - system_id → employee_number
   - first_name + last_name → name
   ↓
5. Show sync confirmation toast
```

## File Structure

```
frontend/
├── src/
│   ├── services/
│   │   └── api.js                 # API service layer
│   ├── components/
│   │   ├── LoginView.vue          # Login component
│   │   └── ...
│   └── App.vue                    # Main app with auth logic

backend/
├── bridge.py                      # PyQt bridge with sync methods
├── database.py                    # Database operations
├── create_admin_user.py           # Create default admin
└── verify_database.py             # Verify schema
```

## API Endpoints Used

### 1. Login
```http
POST /api/auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "status": "success",
  "detail": "User logged in.",
  "has_admin_portal_access": true,
  "has_employee_portal_access": true,
  "jwt": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
      "pk": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

### 2. Get User Info
```http
GET /api/auth/user/
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "is_superuser": false,
  "is_staff": false,
  "employee_portal_access": true,
  "admin_portal_access": true,
  "company": {
    "id": 1,
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "address": "123 Business Street, Manila",
    "contact_number": "+63 2 1234 5678",
    "email": "info@acmecorp.com",
    "timezone": "Asia/Manila"
  },
  "employee": {
    "id": 1,
    "system_id": 101,
    "first_name": "John",
    "last_name": "Doe",
    "position": { "id": 1, "name": "Manager" },
    "department": { "id": 1, "name": "IT" }
  },
  "roles": [],
  "permissions": {
    "employees": { "read": true, "write": true }
  }
}
```

### 3. Get Employees
```http
GET /api/employees/?limit=1000&is_active=true
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "system_id": 101,
      "first_name": "John",
      "last_name": "Doe",
      "middle_name": "Michael",
      "email": "john.doe@company.com",
      "is_active": true,
      ...
    }
  ],
  "total_records": 150,
  "current_page": 1,
  "total_pages": 1
}
```

### 3. Refresh Token
```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "access_token_expiration": "2025-11-03T12:00:00Z"
}
```

### 4. Verify Token
```http
POST /api/auth/token/verify/
Content-Type: application/json

{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response:**
```json
{}
```
(Empty object means token is valid)

### 5. Logout
```http
POST /api/auth/logout/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

## Database Mapping

| API Field | Database Field | Description |
|-----------|---------------|-------------|
| `system_id` | `backend_id` | Unique identifier from API |
| `system_id` | `employee_number` | Used for kiosk login |
| `first_name + last_name` | `name` | Full employee name |
| `email` | (not stored) | Not used in kiosk |

## Setup Instructions

### 1. Verify Database Schema
```bash
cd backend
python3 verify_database.py
```

Should show:
```
✅ Database schema is ready for API integration!
```

### 2. Start the Application
```bash
# Make sure backend API is running at http://localhost:8000
# Then start the desktop app
python3 backend/main.py
```

### 3. Test Login
1. Enter your email and password
2. Click "Sign in"
3. App will authenticate with API
4. Employees will sync automatically
5. You'll be redirected to the main kiosk screen

## Error Handling

### Common Scenarios

**1. Invalid Credentials**
```
Error: "Invalid email or password"
→ Check email/password and try again
```

**2. Network Error**
```
Error: "Network error"
→ Verify API is running at http://localhost:8000
→ Check firewall/network settings
```

**3. Token Expired**
```
Automatic token refresh triggered
→ No user action needed
→ If refresh fails, user is logged out
```

**4. Unverified Account**
```
Error: "Your account email is not verified"
→ Check email for verification link
```

**5. 2FA Required**
```
Error: "Two-factor authentication is required"
→ Feature coming soon
```

## Security Features

### Token Storage
- ✅ Tokens stored in localStorage (encrypted by OS)
- ✅ Tokens cleared on logout
- ✅ Automatic token refresh
- ✅ Token blacklisting on logout

### Password Security
- ✅ Passwords never stored locally
- ✅ JWT tokens used for authentication
- ✅ Tokens have expiration time
- ✅ HTTPS recommended for production

## Development vs Production

### Development (Current)
```javascript
const API_BASE_URL = 'http://localhost:8000'
```

### Production
```javascript
const API_BASE_URL = 'https://your-domain.com'
```

Update `frontend/src/services/api.js` line 5 for production deployment.

## Troubleshooting

### Check Token Status
Open browser console (if running in dev mode):
```javascript
localStorage.getItem('access_token')
localStorage.getItem('refresh_token')
localStorage.getItem('user_data')
```

### Clear Stored Session
```javascript
localStorage.clear()
// Then refresh the app
```

### Verify API Connection
```bash
curl http://localhost:8000/api/auth/login/ \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## Testing Checklist

- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Automatic employee sync after login
- [ ] Session persistence (close and reopen app)
- [ ] Token refresh on expiration
- [ ] Logout functionality
- [ ] Network error handling
- [ ] Employee number login after sync

## Future Enhancements

- [ ] 2FA/OTP support
- [ ] Offline mode with sync queue
- [ ] Background employee sync
- [ ] Password change functionality
- [ ] User profile management
- [ ] Multi-company support
- [ ] Push notification for employee updates

## Support

For issues or questions:
1. Check API documentation: `http://localhost:8000/api/schema/swagger-ui/`
2. Review console logs for errors
3. Verify database with `verify_database.py`
4. Check network connectivity to API

---

**Last Updated**: 2025-11-03
**API Version**: v1.0
**App Version**: v2.0.0
