# Kiosk Application Development Guide (Reference Document)

## 📌 Overview
This document serves as the primary development reference for the **Kiosk Desktop Application** for Employee Self‑Service (ESS), designed to support:

- **Timekeeping** (Time IN/OUT with automatic photo capture)
- Filing of: **Overtime**, **Leave**, etc.
- Viewing **Recent Logs** and **Holiday Announcements**
- Full **offline-first capability** with local database + sync queue

The kiosk UI is designed for **fast throughput** in environments like manufacturing.

> ✅ MVP first focuses on Time IN/OUT only, then more features added by phase.

---

## ✅ Technology Stack
| Component | Technology |
|----------|------------|
| Desktop Runtime | Python + Electron/Node Wrapper *(or)* PyQt with embedded web UI |
| UI Frontend | Vue.js + TailwindCSS |
| Local Database | SQLite (Indexed for speed) |
| Media Capture | WebRTC Camera (JS) |
| Sync to Backend | Python Service (background monitoring + queue) |

---

## ✅ Core Functional Requirements
- Camera is **always active** on the main screen
- Employee enters ID → clicks **IN** or **OUT**
- System immediately:
  - Captures a **photo** from camera
  - Saves offline log: `employee_id`, `action`, `timestamp`, `photo_base64/filepath`
  - Shows **toast** success/error
  - Clears screen for next employee
- No extra confirmation screen

> 🔥 Goal: Maximum speed → minimum interaction.

---

## ✅ Phased Development

### Phase 1 — **Core MVP**
✅ Time IN/OUT only
✅ Camera capture
✅ Local DB storage
✅ Sync queue placeholder
✅ Success / Error toast
✅ Basic offline-first behavior

### Phase 2 — **Menu + Secure Features**
✅ More Options button
✅ PIN authentication
✅ OT/Leave filing forms
✅ Recent logs display
✅ Holidays & announcements

### Phase 3 — **Sync + Admin Tools**
✅ Automatic background sync to API
✅ Employee data caching
✅ Admin config settings
✅ Optimized local DB indexes

### Phase 4 — **Biometric Support (Optional)**
✅ Fingerprint scanner integration
✅ Cloud‑synced templates
✅ Used for secure menu unlock

### Phase 5 — **Face Recognition (Optional)**
✅ Faster identity verification
✅ Hands‑free mode

---

## ✅ Data Flow Summary
```
[Camera + UI] → [Vue Trigger] → [Python Bridge] →
→ Save Log to SQLite + Queue →
→ Sync Job → API Server (when online)
```

---

## ✅ Kiosk Home Screen Wireframe
*(Phase 1 Core MVP)*

```
+---------------------------------------------------+
|                      CAMERA                       |
|                 (Live preview)                    |
+---------------------------------------------------+

| Enter Employee ID: [___________]                  |
|                                                   |
| +-----+-----+-----+                               |
| |  1  |  2  |  3  |                               |
| +-----+-----+-----+                               |
| |  4  |  5  |  6  |                               |
| +-----+-----+-----+                               |
| |  7  |  8  |  9  |                               |
| +-----+-----+-----+                               |
| |  ←  |  0  | CLR |                               |
| +-----+-----+-----+                               |

| +------------+   +------------+   +--------------+ |
| |    IN      |   |    OUT     |   | More Options | |
| +------------+   +------------+   +--------------+ |
|
| [ Toast: Success / Error ]                        |
+---------------------------------------------------+
```

### 🎯 Trigger Logic
- **IN** → records a **Clock-In**
- **OUT** → records **Clock-Out**
- Both immediately capture photo + save log locally

---

## ✅ Database (Initial Schema)
**Table: kiosk_logs**
| Field | Type | Notes |
|-------|------|------|
| id | PK | Auto-increment |
| employee_id | TEXT | Required |
| action | TEXT | "IN" or "OUT" |
| timestamp | DATETIME | Local device time |
| photo_path | TEXT | Saved image file path |
| synced | BOOLEAN | 0 = pending sync |

**Future tables:** employees, leave_requests, ot_requests, announcements

---

## ✅ Toast Notifications
- Appears top‑center or bottom‑center
- Disappears after 2–3 seconds
- Shows error if:
  - Empty employee ID
  - DB write failure
  - Camera capture failure

---

## ✅ Hardware Considerations
- Runs fullscreen, kiosk‑locked
- Camera supports 720p minimum
- Offline for **weeks** without data loss
- Sync runs automatically when online

---

## ✅ Pending Decisions (to be finalized later)
| Feature | Status |
|--------|--------|
| Biometric brand (ZKTeco, Suprema, etc.) | TBD |
| Face recognition model type | TBD |
| Theme customization per company | Later phase |

---

## ✅ Notes for Developers
- UI and capture must **not freeze** when logging
- Camera stays ON at all times
- Reset input instantly after submission
- Store photos locally using lightweight compression
- API sync must retry silently without blocking user

---

💡 This document will be iterated as development progresses.

**End of Reference Document — Version 1.0**

