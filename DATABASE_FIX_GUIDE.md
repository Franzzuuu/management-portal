# Database Connection Pool Fix - Implementation Guide

## Changes Made

### 1. Database Pool Configuration (`src/lib/database.js`)

**Key Changes:**
- Reduced `connectionLimit` from 25 to 10 to prevent pool exhaustion
- Added `maxIdle: 10` - limits idle connections
- Added `idleTimeout: 60000` - closes idle connections after 60 seconds
- Increased `connectTimeout` to 10000ms (10 seconds)
- Added `isPoolClosing` flag to prevent operations during shutdown
- Improved connection lifecycle logging (acquire/release)
- Removed automatic pool destruction on errors

**Why These Changes:**
- Lower connection limit prevents overwhelming the database
- Idle timeout prevents connection hoarding
- Better error recovery without destroying the entire pool

### 2. Enhanced Error Handling

**Query Retry Logic:**
- Handles `ER_CON_COUNT_ERROR` (too many connections)
- Handles `ECONNREFUSED` (connection refused)
- Handles generic "Too many connections" errors
- Exponential backoff on retries (500ms, 1000ms, 1500ms)
- Proper connection cleanup in finally blocks

### 3. API Route Improvements

**Admin Snapshot Route (`src/app/api/admin/snapshot/route.js`):**
- Uses `Promise.allSettled()` instead of sequential queries
- Prevents one query failure from breaking all queries
- Returns partial data on failures instead of complete failure
- Better error logging

### 4. Health Check Endpoint

**New Route:** `/api/health/db`
- Tests database connectivity
- Returns health status
- Useful for monitoring

## MySQL Server Configuration Recommendations

Add/modify these settings in your MySQL configuration file (`my.ini` or `my.cnf`):

```ini
[mysqld]
# Connection Management
max_connections = 50
max_connect_errors = 100
connect_timeout = 10
wait_timeout = 600
interactive_timeout = 600

# Connection Pooling
thread_cache_size = 8

# Performance
innodb_buffer_pool_size = 256M  # Adjust based on available RAM
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Query Cache (if using MySQL < 8.0)
query_cache_type = 1
query_cache_size = 32M
query_cache_limit = 2M
```

## Environment Variables Check

Ensure your `.env.local` has proper database configuration:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_database
```

## Testing the Fix

### 1. Restart Your Application
```bash
npm run dev
```

### 2. Check Database Health
```bash
curl http://localhost:3000/api/health/db
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-12-11T..."
}
```

### 3. Monitor Connection Pool
Watch your console for these logs:
- `Connection X acquired`
- `Connection X released`

### 4. Load Testing
Test with multiple simultaneous requests to ensure stability:
```bash
# Using Apache Bench (if installed)
ab -n 100 -c 10 http://localhost:3000/api/admin/snapshot
```

## Troubleshooting

### If "Too many connections" persists:

1. **Check active MySQL connections:**
```sql
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads_connected';
SHOW VARIABLES LIKE 'max_connections';
```

2. **Increase MySQL max_connections temporarily:**
```sql
SET GLOBAL max_connections = 100;
```

3. **Find connection leaks:**
```sql
SELECT * FROM information_schema.processlist 
WHERE user = 'your_db_user' 
ORDER BY time DESC;
```

4. **Restart MySQL service** (Windows):
```cmd
net stop mysql80
net start mysql80
```

### If "Pool is closed" persists:

1. Check for unhandled promise rejections in API routes
2. Ensure all `getConnection()` calls have corresponding `release()`
3. Restart the Next.js application
4. Clear any cached connections

## Monitoring Best Practices

### Add Console Logging (Development)
Monitor connection usage in your application:
```javascript
// In database.js (optional)
pool.on('acquire', (connection) => {
    console.log(`[${new Date().toISOString()}] Connection ${connection.threadId} acquired`);
});
```

### Production Monitoring
Consider implementing:
- Connection pool metrics (acquired/released/pending)
- Query performance monitoring
- Error rate tracking
- Alert thresholds for connection pool exhaustion

## Expected Improvements

After implementing these fixes:
- ✅ No more "Pool is closed" errors
- ✅ Reduced "Too many connections" errors
- ✅ Better error recovery
- ✅ Graceful handling of connection pool exhaustion
- ✅ Improved application stability under load

## Additional Optimizations

### 1. Database Indexing
Ensure proper indexes on frequently queried columns:
```sql
-- Access logs
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp);
CREATE INDEX idx_access_logs_vehicle_id ON access_logs(vehicle_id);

-- Vehicles
CREATE INDEX idx_vehicles_approval ON vehicles(approval_status, sticker_status);
CREATE INDEX idx_vehicles_usc_id ON vehicles(usc_id);

-- Users
CREATE INDEX idx_users_usc_id ON users(usc_id);
```

### 2. Query Optimization
- Use `LIMIT` clauses appropriately
- Avoid `SELECT *` when specific columns are needed
- Use prepared statements (already implemented)

### 3. Caching Strategy
Consider implementing caching for:
- User profile data (rarely changes)
- Vehicle information (changes infrequently)
- Statistics and dashboard data (can be stale by a few seconds)

## Files Modified

1. `src/lib/database.js` - Core pool configuration and query methods
2. `src/app/api/admin/snapshot/route.js` - Parallel query execution
3. `src/app/api/health/db/route.js` - New health check endpoint

## Next Steps

1. ✅ Deploy changes
2. ✅ Monitor logs for connection issues
3. ✅ Test under normal load
4. ✅ Test under heavy load
5. ✅ Optimize MySQL configuration if needed
6. ⏳ Implement connection pool monitoring dashboard (optional)
7. ⏳ Set up alerting for database issues (optional)
