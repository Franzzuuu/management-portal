# Violation Auto-Close Feature

This feature automatically closes (records permanently) violations that have been pending for more than 7 days. Once closed, violations move from "Current Violations" to "History" for Carolinian users.

## Overview

- **Threshold**: 7 days (configurable)
- **Source Status**: `pending`
- **Target Status**: `closed`
- **Behavior**: Violations with `closed` status appear only in History, not in Current Violations

## Quick Setup (New Machine)

### Option 1: Using the Setup Script (Recommended)

1. Pull the latest code:
   ```bash
   git pull
   ```

2. Run the quick setup:
   ```bash
   .\scripts\setup-auto-close.bat
   ```

3. Open PowerShell **as Administrator** and run:
   ```powershell
   .\scripts\setup-auto-close-task.ps1
   ```

### Option 2: Manual Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the migration:
   ```bash
   npm run migrate:auto-close
   ```

3. Set up Windows Task Scheduler (see below)

## Database Changes

The migration adds two new columns to the `violations` table:

```sql
ALTER TABLE violations ADD COLUMN closed_at DATETIME NULL DEFAULT NULL;
ALTER TABLE violations ADD COLUMN closed_reason VARCHAR(255) NULL DEFAULT NULL;
```

An index is also created for efficient querying:
```sql
CREATE INDEX idx_violations_status_created ON violations (status, created_at);
```

## Setup

### 1. Run the Migration

```bash
npm run migrate:auto-close
```

Or manually:
```bash
node scripts/run-auto-close-migration.js
```

### 2. Set Environment Variable (Optional)

Add a `CRON_SECRET` to your `.env.local` file for secure API access:

```env
CRON_SECRET=your-secure-random-string
```

## Usage Options

### Option 1: API Endpoint (Recommended for Cloud/Serverless)

The API endpoint can be called by external schedulers (Vercel Cron, AWS CloudWatch, etc.).

**Dry Run (Preview)**:
```bash
GET /api/violations/auto-close
Authorization: Bearer <CRON_SECRET>
```

**Execute**:
```bash
POST /api/violations/auto-close
Authorization: Bearer <CRON_SECRET>
```

Admin users can also call these endpoints directly (authenticated via session).

### Option 2: Standalone Script (For Self-Hosted)

Run the script directly via cron job or scheduled task:

```bash
npm run auto-close-violations
```

Or:
```bash
node scripts/auto-close-violations.js
```

### Option 3: Windows Task Scheduler

1. Open Task Scheduler
2. Create a new task
3. Set trigger: Daily at midnight (or desired time)
4. Set action: 
   - Program: `node`
   - Arguments: `scripts/auto-close-violations.js`
   - Start in: `D:\Projects\management-portal` (your project path)

**Or use the PowerShell setup script:**
```powershell
# Run as Administrator
.\scripts\setup-auto-close-task.ps1

# With custom time (default is 12:00AM)
.\scripts\setup-auto-close-task.ps1 -Time "6:00AM"

# With custom project path
.\scripts\setup-auto-close-task.ps1 -ProjectPath "C:\MyProject\management-portal"
```

### Option 4: Linux/Mac Cron Job

Add to crontab (`crontab -e`):

```bash
# Run daily at midnight
0 0 * * * cd /path/to/management-portal && /usr/bin/node scripts/auto-close-violations.js >> /var/log/auto-close.log 2>&1
```

### Option 5: Vercel Cron (For Vercel Deployments)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/violations/auto-close",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## Status Flow

```
[pending] -- (7 days pass) --> [closed]
```

The violation is permanently recorded and will:
- ✅ Appear in History view
- ❌ Not appear in Current Violations
- ✅ Be visible to Admin in all views
- ✅ Have `closed_at` timestamp and `closed_reason` recorded

## API Response Examples

### GET (Dry Run)

```json
{
  "success": true,
  "dryRun": true,
  "autoCloseDays": 7,
  "eligibleCount": 3,
  "violations": [
    {
      "id": 15,
      "violation_type": "Illegal Parking",
      "plate_number": "ABC-123",
      "owner_name": "John Doe",
      "created_at": "2025-11-20T10:30:00.000Z",
      "days_pending": 14,
      "location": "Main Gate"
    }
  ],
  "message": "3 violation(s) would be auto-closed. Use POST to execute."
}
```

### POST (Execute)

```json
{
  "success": true,
  "closed": 3,
  "closedIds": [15, 16, 17],
  "closedBy": "system",
  "source": "cron",
  "autoCloseDays": 7,
  "message": "Successfully auto-closed 3 violation(s) that were pending for 7+ days."
}
```

## Customization

To change the auto-close threshold, modify the `AUTO_CLOSE_DAYS` constant in:
- `src/app/api/violations/auto-close/route.js`
- `scripts/auto-close-violations.js`

## Troubleshooting

### No violations being closed
- Ensure violations have `status = 'pending'`
- Check if violations are older than 7 days
- Run the GET endpoint first to see eligible violations

### Database connection errors
- Verify `.env.local` has correct database credentials
- Ensure the database server is running

### Permission denied
- For API: Ensure `CRON_SECRET` is set and matches the Authorization header
- For Admin access: Ensure user has Admin role
