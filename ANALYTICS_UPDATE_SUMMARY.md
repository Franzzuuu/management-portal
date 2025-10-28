# Dashboard Analytics Update Summary

## Changes Made

### 1. Updated Analytics API (`/src/app/api/analytics/route.js`)

**Data Sources Updated:**

- ✅ **User Distribution**: Source from `users` table, grouped by `designation` column
- ✅ **Vehicle Distribution**: Source from `vehicles` table, grouped by `vehicle_type` column
- ✅ **Access Patterns**: Source from `access_logs` table, showing entry vs. exit patterns by hour
- ❌ **Removed Violation Trends**: Completely removed violation-related data queries

**Metrics Cards Logic Updated:**

- ✅ **Peak Hour Entry**: Queries `access_logs` for hour with highest entry count
- ✅ **Peak Hour Exit**: Queries `access_logs` for hour with highest exit count
- ✅ **Active Users (Last 30 Days)**: Counts unique users via JOIN between users → vehicles → access_logs
- ✅ **Avg. Daily Access**: Computes average daily total (entries + exits) for last 30 days

**API Response Structure Simplified:**

- Flattened response structure for easier consumption
- Removed nested `analytics` object
- Direct access to data properties

### 2. Updated Dashboard Component (`/src/app/components/DashboardAnalytics.js`)

**Chart Updates:**

- ✅ **User Distribution Chart**: Uses real database data from users table
- ✅ **Vehicle Distribution Chart**: Uses real database data from vehicles table
- ✅ **Monthly Trends Chart**: Shows only access logs (removed violations line)
- ✅ **Access Patterns Chart**: Entry vs Exit by hour from access_logs table
- ❌ **Removed Violation Trends Section**: Completely removed from UI

**Data Processing Updates:**

- Updated data processing functions to match new API structure
- Removed violation-related processing functions
- Simplified chart data state management

### 3. Database Performance Optimizations

**Created Analytics-Specific Indexes:**

- `idx_access_logs_analytics_timestamp`: For timestamp-based queries
- `idx_access_logs_analytics_entry_type`: For entry/exit filtering
- `idx_access_logs_analytics_hour`: For hourly analytics queries
- `idx_access_logs_analytics_date`: For daily grouping
- `idx_access_logs_analytics_month`: For monthly trends
- `idx_vehicles_analytics_type`: For vehicle distribution
- `idx_users_analytics_designation`: For user distribution
- Additional JOIN optimization indexes for active users calculation

**Migration Files Created:**

- `/src/lib/migrations/add_analytics_indexes.js`: Database index migration
- `/scripts/run-analytics-indexes-migration.js`: Migration runner script

### 4. Key Features

**Real Database Integration:**

- All analytics based on actual database values
- No hardcoded or static test data
- Proper error handling for missing data

**Performance Optimized:**

- Strategic database indexes for analytics queries
- Efficient JOIN operations for active users calculation
- Timezone handling for Asia/Manila

**Theme Consistency:**

- Maintained existing green (#355E3B) and gold (#FFD700) color scheme
- Preserved card layouts and styling
- Consistent with existing dashboard design

## Database Queries Summary

### User Distribution

```sql
SELECT designation, COUNT(*) AS count
FROM users
WHERE status = 'active'
GROUP BY designation
```

### Vehicle Distribution

```sql
SELECT vehicle_type, COUNT(*) AS count
FROM vehicles
GROUP BY vehicle_type
```

### Peak Hour Entry

```sql
SELECT HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila')) AS hour, COUNT(*) AS count
FROM access_logs
WHERE entry_type = 'entry'
GROUP BY HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila'))
ORDER BY count DESC
LIMIT 1
```

### Peak Hour Exit

```sql
SELECT HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila')) AS hour, COUNT(*) AS count
FROM access_logs
WHERE entry_type = 'exit'
GROUP BY HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila'))
ORDER BY count DESC
LIMIT 1
```

### Active Users (Last 30 Days)

```sql
SELECT COUNT(DISTINCT u.id) as count
FROM users u
JOIN vehicles v ON u.usc_id = v.usc_id
JOIN access_logs al ON v.vehicle_id = al.vehicle_id
WHERE al.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
```

### Access Patterns (Entry vs Exit by Hour)

```sql
SELECT
    HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila')) AS hour,
    SUM(CASE WHEN entry_type = 'entry' THEN 1 ELSE 0 END) AS entry_count,
    SUM(CASE WHEN entry_type = 'exit' THEN 1 ELSE 0 END) AS exit_count
FROM access_logs
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY HOUR(CONVERT_TZ(timestamp, 'UTC', 'Asia/Manila'))
ORDER BY hour
```

## Next Steps

1. **Run Analytics Migration**: Execute the analytics indexes migration when database is available:

   ```bash
   node scripts/run-analytics-indexes-migration.js
   ```

2. **Test Dashboard**: Verify all analytics display correctly with real data

3. **Monitor Performance**: Check query execution times with new indexes

## Files Modified

- ✅ `/src/app/api/analytics/route.js` - Updated API logic
- ✅ `/src/app/components/DashboardAnalytics.js` - Updated component
- ✅ `/src/lib/migrations/add_analytics_indexes.js` - New migration
- ✅ `/scripts/run-analytics-indexes-migration.js` - Migration runner
