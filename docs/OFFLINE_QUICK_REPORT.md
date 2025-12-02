# Offline Quick Report - Handheld Device Support

## 🎯 Problem Solved

Handheld devices can now **capture violation data even when offline** and automatically sync it to the main database when connection is restored.

## ✨ Features

### 1. **Automatic Queue System**
- Reports are automatically queued when device is offline
- No data loss - stored locally in browser
- Automatic sync when connection restored
- Manual sync button available

### 2. **Visual Indicators**
- 📴 **Offline Banner**: Shows when device loses connection
- 📊 **Queue Status**: Displays pending/failed reports count
- 🔄 **Sync Button**: Manual trigger for sync
- ✅ **Success Feedback**: Shows when reports are synced

### 3. **Smart Retry Logic**
- Auto-retry failed uploads (max 3 attempts)
- 30-second sync interval
- Exponential backoff for failures
- Queue statistics tracking

## 🔧 How It Works

### Data Flow

```
┌──────────────────┐
│ Handheld Device  │
│   (Offline)      │
└────────┬─────────┘
         │
         │ 1. Capture Data
         │    - tag_uid
         │    - violation_type
         │    - photo (converted to base64)
         │    - location
         │
         v
┌──────────────────┐
│  localStorage    │  ← Stored locally
│  (Queue)         │
└────────┬─────────┘
         │
         │ 2. Device comes online
         │
         v
┌──────────────────┐
│  Auto-Sync       │  ← Triggered by:
│  Process         │     - Coming online
│                  │     - 30s interval
│                  │     - Manual button
└────────┬─────────┘
         │
         │ 3. Convert base64 → File
         │ 4. POST to API
         │
         v
┌──────────────────┐
│  Main Database   │  ← Data persisted
└──────────────────┘
```

### Storage Format

Queue items stored in `localStorage` as JSON:

```json
{
  "id": 1733155200123,
  "timestamp": "2025-12-02T10:30:00Z",
  "data": {
    "tag_uid": "ABC123",
    "violation_type_id": 2,
    "location": "Gate 2",
    "photo_base64": "data:image/jpeg;base64,/9j/4AAQ...",
    "photo_name": "IMG_001.jpg",
    "photo_type": "image/jpeg"
  },
  "status": "pending",
  "retryCount": 0,
  "error": null
}
```

## 🚀 Usage

### For Security Staff

1. **Normal Operation (Online)**
   - Click "Quick Report (by Tag)"
   - Fill form and submit
   - Report is sent immediately
   - Success message appears

2. **Offline Operation**
   - Device loses connection (shows orange banner)
   - Click "Quick Report (by Tag)"
   - Fill form and submit
   - Report is **queued locally**
   - See message: "📴 Device is offline. Report queued for sync"

3. **Automatic Sync**
   - Device reconnects (banner disappears)
   - Queue syncs automatically within 30 seconds
   - Success notification shows: "✅ Synced X report(s)"

4. **Manual Sync**
   - See queue status banner (blue)
   - Click "Sync Now" button
   - Watch reports upload in real-time

### Queue Status Indicators

| Status | Icon | Meaning |
|--------|------|---------|
| **Pending** | ⏳ | Waiting to be synced |
| **Syncing** | 🔄 | Currently uploading |
| **Failed** | ⚠️ | Upload failed (will retry) |
| **Completed** | ✅ | Successfully synced |

## 📱 API Changes

### Enhanced Quick Report Endpoint

The endpoint now handles both online and queued submissions identically:

```javascript
POST /api/violations/quick-report
Content-Type: multipart/form-data

// Same fields whether submitted live or from queue:
{
  tag_uid: "ABC123",
  violation_type_id: 2,
  photo: File,
  location: "Gate 2"
}
```

No changes needed to the backend!

## 🧪 Testing

### Test Offline Mode

1. **Simulate Offline**:
   ```javascript
   // In browser console:
   window.dispatchEvent(new Event('offline'));
   ```

2. **Submit Report**: Should queue successfully

3. **Check Queue**:
   ```javascript
   // In browser console:
   localStorage.getItem('offline_violation_queue');
   ```

4. **Simulate Online**:
   ```javascript
   window.dispatchEvent(new Event('online'));
   ```

5. **Verify Sync**: Reports should upload automatically

### Test Scenarios

#### ✅ Scenario 1: Device Goes Offline Mid-Session
1. Start with device online
2. Turn off WiFi/Mobile data
3. Submit quick report
4. Verify queued message appears
5. Turn on connection
6. Wait 30 seconds or click "Sync Now"
7. Verify report appears in violations list

#### ✅ Scenario 2: Multiple Offline Reports
1. Turn off connection
2. Submit 3-5 quick reports
3. Verify queue shows "5 pending"
4. Turn on connection
5. Click "Sync Now"
6. Verify all 5 reports sync successfully

#### ✅ Scenario 3: Partial Sync Failure
1. Queue 3 reports
2. Make 1 report invalid (e.g., bad violation_type_id)
3. Sync
4. Verify 2 succeed, 1 fails
5. Fix the failed one (edit in localStorage)
6. Retry sync

#### ✅ Scenario 4: Server Down
1. Stop the backend server
2. Submit report (device thinks it's online)
3. Verify report is queued on server error
4. Start server
5. Sync and verify success

## 🔒 Security Considerations

### Local Storage Security

- **Max Queue Size**: 100 items (prevents storage overflow)
- **Auto-Cleanup**: Completed items removed after sync
- **No Sensitive Data**: Only violation data stored (no passwords)
- **Base64 Images**: Temporarily stored, deleted after sync

### Data Integrity

- **Unique IDs**: Each queue item has unique timestamp-based ID
- **Retry Limit**: Max 3 attempts to prevent infinite loops
- **Error Logging**: Failed attempts logged with reason
- **Transaction Safety**: All syncs wrapped in try-catch

## 📊 Queue Management

### View Queue Statistics

```javascript
import { getQueueStats } from '@/lib/offline-queue';

const stats = getQueueStats();
console.log(stats);
// {
//   total: 5,
//   pending: 3,
//   syncing: 1,
//   failed: 1,
//   completed: 0
// }
```

### Manual Queue Operations

```javascript
import { syncQueue, clearCompleted } from '@/lib/offline-queue';

// Manual sync
await syncQueue();

// Clear completed items
clearCompleted();
```

### Clear Entire Queue (Emergency)

```javascript
// In browser console:
localStorage.removeItem('offline_violation_queue');
```

## 🐛 Troubleshooting

### Issue: Reports Not Syncing

**Symptoms**: Queue shows pending items but sync fails

**Solutions**:
1. Check network connection (try opening another website)
2. Verify server is running (`http://localhost:3000`)
3. Check browser console for errors (F12)
4. Try manual sync button
5. Check if max queue size reached (100 items)

### Issue: Queue Full

**Symptoms**: "Storage may be full" error

**Solutions**:
1. Sync existing items first
2. Clear completed items
3. Check localStorage space:
   ```javascript
   const size = new Blob([localStorage.getItem('offline_violation_queue')]).size;
   console.log('Queue size:', size, 'bytes');
   ```

### Issue: Images Not Uploading

**Symptoms**: Reports sync but images missing

**Solutions**:
1. Check image size (max 10MB)
2. Verify image format (JPEG/PNG only)
3. Check base64 conversion:
   ```javascript
   // Should start with: data:image/jpeg;base64,
   ```

### Issue: Duplicate Reports

**Symptoms**: Same violation appears multiple times

**Solutions**:
1. Check if submit button clicked multiple times
2. Clear queue after successful sync
3. Refresh violations list

## 📈 Performance

### Storage Limits

- **localStorage max**: ~5-10MB (browser dependent)
- **Per item**: ~1-2MB average (with base64 image)
- **Max queue size**: 100 items (configurable)
- **Typical usage**: 5-10 queued reports = ~10-20MB

### Sync Performance

- **Single report**: ~2-5 seconds (depends on image size)
- **Batch sync (10 reports)**: ~20-50 seconds
- **Network speed**: 4G/5G recommended
- **Retry interval**: 30 seconds between attempts

## 🔮 Future Enhancements

### Planned Features

1. **IndexedDB Support**: For larger storage capacity
2. **Compression**: Reduce image size before storage
3. **Priority Queue**: Urgent violations sync first
4. **Selective Sync**: Choose which items to sync
5. **Conflict Resolution**: Handle concurrent edits
6. **Export Queue**: Download queue as JSON backup
7. **Queue Encryption**: Encrypt sensitive data in storage

### Mobile App Integration

When building a native mobile app:
- Use SQLite instead of localStorage
- Implement background sync
- Add push notifications for sync status
- Support offline maps for location

## 📞 Support

### Common Questions

**Q: How long are reports stored locally?**  
A: Until successfully synced. Max 100 items, then oldest removed.

**Q: What happens if I close the browser?**  
A: Queue persists in localStorage. Will sync on next session.

**Q: Can I use this on multiple devices?**  
A: Yes, each device has its own queue. No conflicts.

**Q: What if my device runs out of storage?**  
A: Queue will reject new items. Sync existing ones first.

**Q: Are queued reports visible to admin?**  
A: No, only after successful sync to database.

---

**Last Updated**: December 2, 2025  
**Version**: 2.0.0  
**Feature**: Offline Queue System
