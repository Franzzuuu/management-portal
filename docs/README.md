# Quick Report Violation Feature

## 📋 Overview

The Quick Report feature enables security personnel to quickly report violations using handheld devices by scanning RFID tags. The system automatically populates all violation details and supports offline operation.

## 🚀 Quick Start

### 1. Run Database Migrations

```bash
node scripts/run-quick-report-migrations.js
```

### 2. Access the Feature

1. Login as **Security** or **Admin** user
2. Navigate to: **Security → Violations Management**
3. Click **"Quick Report (by Tag)"** (amber button)

### 3. Report a Violation

**Required Fields:**
- RFID Tag UID (e.g., "ABC123")
- Violation Type (dropdown)
- Photo (JPEG/PNG, max 10MB)

**Optional:**
- Location (e.g., "Gate 2")

### 4. How It Works

The system uses the tag UID to automatically find:
- Vehicle information (plate, make, model)
- Owner details (USC ID, name, email)
- All other required fields

## 🔌 Offline Support

### Automatic Queue System

When the device loses connection:
- ✅ Reports are saved locally (localStorage)
- ✅ Auto-sync when connection restored
- ✅ Manual "Sync Now" button available
- ✅ Visual indicators for offline/queue status

### Status Indicators

| Icon | Status | Description |
|------|--------|-------------|
| 📴 | Offline | Device has no connection |
| 📊 | Queue Active | Reports waiting to sync |
| 🔄 | Syncing | Currently uploading |
| ✅ | Synced | Successfully uploaded |

## 🔍 How Tag Lookup Works

```sql
tag_uid → rfid_tags → vehicles → users → user_profiles
```

**Single Query:**
```sql
SELECT v.vehicle_id, v.plate_number, v.make, v.model, v.usc_id
FROM rfid_tags rt
JOIN vehicles v ON rt.vehicle_id = v.vehicle_id
WHERE rt.tag_uid = 'ABC123' AND rt.status = 'active'
```

**Result:** Complete vehicle and owner info from just the tag UID!

## 📡 API Endpoint

```http
POST /api/violations/quick-report
Content-Type: multipart/form-data

Body:
  tag_uid: string (required)
  violation_type_id: integer (required)
  photo: file (required, JPEG/PNG, max 10MB)
  location: string (optional)

Response: 201 Created
{
  "success": true,
  "violation": { id, vehicle_info, ... }
}
```

## 🗄️ Database Requirements

### Required Columns

```sql
violations.vehicle_id       -- NULLABLE (for unknown tags)
violations.location         -- VARCHAR(255) NULL
violations.contest_status   -- ENUM DEFAULT 'pending'
violations.contest_explanation -- TEXT NULL
```

### Run Migrations

The migration script handles:
- Making vehicle_id nullable
- Adding missing columns
- Updating foreign key constraints

## 🧪 Testing

### Test Offline Mode

1. Open browser DevTools (F12)
2. Network tab → Set to "Offline"
3. Submit a report → should queue
4. Set back to "Online" → should auto-sync

### Test Unknown Tag

1. Enter a tag_uid that doesn't exist
2. Submit report
3. Violation is created with vehicle_id = NULL
4. Description notes "vehicle not found"

## 🐛 Troubleshooting

### Device Can't Connect to Server

**Check:**
- ✅ Server is running (`http://localhost:3000`)
- ✅ Correct API endpoint URL
- ✅ No firewall blocking
- ✅ Valid authentication session

**Solution:** Reports are automatically queued offline and will sync when connection is restored.

### Reports Not Syncing

1. Check network connection
2. Click "Sync Now" button manually
3. Check browser console (F12) for errors
4. Verify queue in localStorage:
   ```javascript
   localStorage.getItem('offline_violation_queue')
   ```

### Image Upload Fails

- Reduce image size (max 10MB)
- Check format (only JPEG/PNG)
- Verify MIME type is correct

### Queue Full

- Sync existing reports first
- Clear completed items automatically
- Max 100 items in queue

## 📁 Project Files

### Created Files
```
src/
  ├── app/api/violations/quick-report/route.js  # API endpoint
  ├── lib/offline-queue.js                       # Queue system
  ├── lib/migrations/
  │   ├── allow_null_vehicle_id_in_violations.js
  │   └── ensure_violations_columns.js
  └── tests/quick-report-violation.test.js       # Test suite

scripts/
  └── run-quick-report-migrations.js             # Migration runner

docs/
  ├── QUICK_REPORT_FEATURE.md                    # Detailed docs
  └── OFFLINE_QUICK_REPORT.md                    # Offline guide
```

### Modified Files
```
src/app/security/violations/page.js              # Added UI + offline support
```

## 📖 Documentation

For detailed documentation, see:
- **`docs/QUICK_REPORT_FEATURE.md`** - Complete API and architecture docs
- **`docs/OFFLINE_QUICK_REPORT.md`** - Offline queue system guide

## 🔐 Security

- ✅ Role-based access (Security & Admin only)
- ✅ SQL injection prevention (parameterized queries)
- ✅ File type validation (MIME check)
- ✅ File size limits (10MB max)
- ✅ Authentication required
- ✅ Input sanitization

## 📞 Support

**Common Issues:**
- **401 Unauthorized**: Login as Security/Admin user
- **400 Bad Request**: Check required fields
- **413 Payload Too Large**: Reduce image size
- **Device Offline**: Reports queued automatically

**For more help, check:**
- Browser console (F12) for error messages
- Server logs for API errors
- Queue status in UI for sync issues

---

**Version**: 2.0.0  
**Last Updated**: December 2, 2025  
**Features**: Quick Report + Offline Queue
