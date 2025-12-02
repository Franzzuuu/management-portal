# Quick Report Violation Feature - Documentation

## Overview

The **Quick Report Violation (by tag_uid)** feature enables security personnel using handheld devices to quickly report violations by scanning an RFID tag and uploading a photo. The system automatically populates all required fields in the violations table, making the reporting process fast and efficient.

## Architecture

### Flow Diagram

```
Handheld Device (Security Staff)
         |
         | 1. Scan RFID Tag → tag_uid
         | 2. Select Violation Type
         | 3. Take Photo
         | 4. Optional: Add Location
         |
         v
POST /api/violations/quick-report
         |
         | Authentication Check
         | Role Check (Security/Admin only)
         |
         v
    Validate Inputs
    - tag_uid (required, 1-100 chars)
    - violation_type_id (required, valid int)
    - photo (required, JPEG/PNG, max 10MB)
    - location (optional)
         |
         v
    Lookup Vehicle by tag_uid
    - Query: rfid_tags → vehicles
    - If found: set vehicle_id
    - If not found: set vehicle_id = NULL
         |
         v
    Build Complete Violation Record
    - vehicle_id: from lookup or NULL
    - violation_type_id: from request
    - description: auto-generated
    - location: from request or NULL
    - reported_by: authenticated user.id
    - status: 'pending'
    - contest_status: 'pending'
    - image_data: photo buffer (BLOB)
    - image_filename: photo.name
    - image_mime_type: photo.type
    - created_at, updated_at: NOW()
         |
         v
    INSERT into violations table
         |
         v
    Post-Creation Actions
    - Emit real-time update
    - Create notification for vehicle owner (if found)
         |
         v
    Return Response (HTTP 201)
    {
      "success": true,
      "violation": { ... },
      "message": "Violation reported successfully"
    }
```

## API Specification

### Endpoint

```
POST /api/violations/quick-report
```

### Authentication

- **Required**: Yes
- **Roles Allowed**: Security, Admin
- **Authorization Header**: Session-based (cookies)

### Request

**Content-Type**: `multipart/form-data`

**Body Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tag_uid` | string | Yes | RFID tag UID (1-100 characters) |
| `violation_type_id` | integer | Yes | Valid violation type ID |
| `photo` | file | Yes | Image file (JPEG/PNG, max 10MB) |
| `location` | string | No | Location description (e.g., "Gate 2") |

**Example Request** (using fetch):

```javascript
const formData = new FormData();
formData.append('tag_uid', 'ABC123DEF');
formData.append('violation_type_id', '2');
formData.append('photo', photoFile);
formData.append('location', 'Main Gate');

const response = await fetch('/api/violations/quick-report', {
  method: 'POST',
  body: formData
});

const data = await response.json();
```

### Response

**Success Response** (HTTP 201):

```json
{
  "success": true,
  "message": "Violation reported successfully",
  "violation": {
    "id": 42,
    "vehicle_id": 7,
    "vehicle_info": {
      "plate_number": "ABC123",
      "make": "Toyota",
      "model": "Corolla"
    },
    "violation_type_id": 2,
    "violation_type_name": "Illegal Parking",
    "description": "Reported via handheld - tag_uid: ABC123DEF, vehicle: ABC123",
    "location": "Main Gate",
    "reported_by": 11,
    "reporter_usc_id": "SEC001",
    "reporter_name": "John Security",
    "status": "pending",
    "contest_status": "pending",
    "created_at": "2025-12-02T10:30:00Z",
    "updated_at": "2025-12-02T10:30:00Z",
    "image_filename": "IMG_20251202_001.jpg",
    "image_mime_type": "image/jpeg",
    "image_url": "/api/violations/42/image"
  }
}
```

**Success Response - Vehicle Not Found** (HTTP 201):

```json
{
  "success": true,
  "message": "Violation reported successfully",
  "violation": {
    "id": 43,
    "vehicle_id": null,
    "vehicle_info": null,
    "description": "Reported via handheld - tag_uid: UNKNOWN999 (vehicle not found)",
    ...
  }
}
```

**Error Responses**:

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Missing required fields | One or more required fields not provided |
| 400 | Invalid image format | Only JPEG/PNG accepted |
| 400 | Invalid tag_uid format | tag_uid must be 1-100 characters |
| 400 | Invalid violation_type_id | Must be a valid integer |
| 400 | Invalid violation type | violation_type_id does not exist |
| 401 | Unauthorized | User not authenticated |
| 403 | Insufficient permissions | User is not Security or Admin |
| 413 | File too large | Photo exceeds 10MB limit |
| 500 | Failed to report violation | Server error |

## Database Schema

### Required Columns in `violations` Table

```sql
CREATE TABLE violations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NULL,                              -- ✓ NULLABLE
  violation_type_id INT NOT NULL,
  description TEXT,
  location VARCHAR(255) NULL,                       -- ✓ ADDED
  reported_by INT NOT NULL,
  status ENUM('pending', 'resolved', 'contested') DEFAULT 'pending',
  contest_status ENUM('pending', 'under_review', 'approved', 'denied') DEFAULT 'pending',  -- ✓ ADDED
  contest_explanation TEXT NULL,                    -- ✓ ADDED
  image_data LONGBLOB,
  image_filename VARCHAR(255),
  image_mime_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
  FOREIGN KEY (violation_type_id) REFERENCES violation_types(id),
  FOREIGN KEY (reported_by) REFERENCES users(id)
);
```

### Migrations Required

Run the migration script to prepare your database:

```bash
node scripts/run-quick-report-migrations.js
```

This will:
1. Make `vehicle_id` nullable in violations table
2. Add `location` column (if missing)
3. Add `contest_status` column (if missing)
4. Add `contest_explanation` column (if missing)

## Frontend Integration

### Security Violations Page

**Location**: `/src/app/security/violations/page.js`

**New Button**:
- Label: "Quick Report (by Tag)"
- Color: Amber/Gold
- Icon: Lightning bolt
- Opens modal form

**Modal Form Fields**:
1. **RFID Tag UID** (required)
   - Text input
   - Placeholder: "Enter RFID tag UID (e.g., ABC123DEF)"
   - Auto-lookup vehicle on submit

2. **Violation Type** (required)
   - Dropdown select
   - Options loaded from `/api/violation-types`

3. **Location** (optional)
   - Text input
   - Placeholder: "e.g., Gate 2, Parking Lot A"

4. **Photo Evidence** (required)
   - File upload
   - Accept: JPEG, PNG
   - Max size: 10MB
   - Drag-and-drop or click to upload

**Success Behavior**:
- Display success message with violation details
- Show vehicle info (if found) or "Not found" message
- Auto-refresh violations list
- Auto-close modal after 3 seconds

## Security Considerations

### Input Validation

1. **tag_uid**: Sanitized to prevent SQL injection, trimmed, length validated (1-100 chars)
2. **violation_type_id**: Parsed as integer, validated against database
3. **photo**: MIME type check (only image/jpeg, image/jpg, image/png), size limit enforced
4. **location**: Optional, trimmed if provided

### SQL Injection Prevention

All database queries use parameterized statements:

```javascript
const vehicle = await queryOne(`
  SELECT v.vehicle_id, v.plate_number
  FROM rfid_tags rt
  INNER JOIN vehicles v ON rt.vehicle_id = v.vehicle_id
  WHERE rt.tag_uid = ?
`, [sanitizedTagUid]);
```

### Authorization

- Endpoint checks user role via session
- Only Security and Admin users can report
- reported_by field set to authenticated user's database ID

### File Upload Security

- MIME type whitelist enforced
- File size limit (10MB) enforced
- File stored as BLOB in database (not on filesystem)
- No executable files accepted

## Testing

### Run Tests

```bash
npm test src/tests/quick-report-violation.test.js
```

### Test Coverage

- ✓ Authentication (401 unauthorized, 403 forbidden)
- ✓ Input validation (missing fields, invalid types, invalid sizes)
- ✓ Vehicle lookup (found, not found, error handling)
- ✓ Record creation (all fields populated correctly)
- ✓ Response format (201 with correct structure)
- ✓ Side effects (real-time updates, notifications)
- ✓ Security (SQL injection prevention, MIME type checks)
- ✓ Edge cases (long tag_uid, special characters, concurrent requests)
- ✓ Database migrations (nullable vehicle_id, required columns)

### Manual Testing Checklist

- [ ] Login as Security user
- [ ] Navigate to `/security/violations`
- [ ] Click "Quick Report (by Tag)" button
- [ ] Enter valid tag_uid (e.g., from rfid_tags table)
- [ ] Select violation type
- [ ] Upload valid image (JPEG/PNG < 10MB)
- [ ] Submit form
- [ ] Verify success message displays
- [ ] Verify vehicle info appears (if tag found)
- [ ] Verify violation appears in list
- [ ] Try with unknown tag_uid → should still create violation
- [ ] Try with missing fields → should show validation errors
- [ ] Try with invalid image type → should reject
- [ ] Try with large file → should reject

## Troubleshooting

### Common Issues

**Issue**: "Unauthorized" error
- **Solution**: Ensure user is logged in as Security or Admin

**Issue**: "Invalid violation type" error
- **Solution**: Check that violation_type_id exists in violation_types table

**Issue**: "File too large" error
- **Solution**: Reduce image size to under 10MB

**Issue**: Migration fails - "vehicle_id cannot be NULL"
- **Solution**: Run migrations before using the feature: `node scripts/run-quick-report-migrations.js`

**Issue**: Vehicle not found even with valid tag_uid
- **Solution**: Check that:
  - RFID tag exists in rfid_tags table
  - Tag has vehicle_id set
  - Tag status is 'active'
  - Vehicle exists in vehicles table

**Issue**: Image not displaying after upload
- **Solution**: Check that image_data was saved as BLOB and image_mime_type is correct

## Performance Considerations

- **Vehicle Lookup**: Indexed query on rfid_tags.tag_uid
- **Image Storage**: BLOB storage in database (consider object storage for scale)
- **Real-time Updates**: Async emit, doesn't block response
- **Notifications**: Async creation, doesn't block response

## Future Enhancements

1. **GPS Location**: Accept GPS coordinates from handheld device
2. **Offline Mode**: Queue violations for sync when connection restored
3. **Batch Upload**: Report multiple violations at once
4. **Image Compression**: Auto-compress images before upload
5. **Object Storage**: Move images to S3/Cloud Storage for scalability
6. **Audit Trail**: Log all quick reports with device metadata
7. **Analytics**: Dashboard showing quick report usage statistics

## Support

For issues or questions:
- Check logs: `console.log` statements in `/api/violations/quick-report/route.js`
- Review database: Check violations table for created records
- Test endpoint: Use Postman or curl to test API directly

## License

This feature is part of the Management Portal system and follows the same license as the main application.

---

**Last Updated**: December 2, 2025  
**Version**: 1.0.0  
**Author**: Development Team
