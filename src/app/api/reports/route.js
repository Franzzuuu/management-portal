import { queryOne, queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';
import { CacheManager, CacheConfig } from '@/lib/cache';

export async function GET(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const offset = (page - 1) * limit;

        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Create cache key based on filters
        const cacheKey = CacheManager.generateOverviewCacheKey({ startDate, endDate, page, limit });

        // Try to get cached data
        if (CacheConfig.SYSTEM_OVERVIEW.enabled) {
            const cachedData = CacheManager.getCachedReportData('overview', { startDate, endDate, page, limit });
            if (cachedData) {
                console.log('Returning cached report data');
                return Response.json({
                    success: true,
                    ...cachedData,
                    fromCache: true
                });
            }
        }

        const dateFilter = startDate && endDate
            ? 'WHERE DATE(al.timestamp) BETWEEN ? AND ?'
            : '';
        const dateParams = startDate && endDate ? [startDate, endDate] : [];

        // Get user statistics
        const [totalUsers, studentCount, facultyCount, staffCount, newUsersThisMonth] = await Promise.all([
            queryOne('SELECT COUNT(*) as count FROM users WHERE status = "active"'),
            queryOne('SELECT COUNT(*) as count FROM users WHERE designation = "Student" AND status = "active"'),
            queryOne('SELECT COUNT(*) as count FROM users WHERE designation = "Faculty" AND status = "active"'),
            queryOne('SELECT COUNT(*) as count FROM users WHERE designation = "Staff" AND status = "active"'),
            queryOne('SELECT COUNT(*) as count FROM users WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)')
        ]);

        // Get vehicle statistics
        const [totalVehicles, approvedVehicles, twoWheelVehicles, fourWheelVehicles] = await Promise.all([
            queryOne('SELECT COUNT(*) as count FROM vehicles'),
            queryOne('SELECT COUNT(*) as count FROM vehicles WHERE approval_status = "approved"'),
            queryOne('SELECT COUNT(*) as count FROM vehicles WHERE vehicle_type = "2-wheel"'),
            queryOne('SELECT COUNT(*) as count FROM vehicles WHERE vehicle_type = "4-wheel"')
        ]);

        // Get access log statistics
        const [totalAccessLogs, accessLogsCount] = await Promise.all([
            queryOne('SELECT COUNT(*) as count FROM access_logs'),
            queryOne(`SELECT COUNT(*) as count FROM access_logs al ${dateFilter}`, dateParams)
        ]);

        // Get violation statistics
        const [totalViolations, pendingViolations] = await Promise.all([
            queryOne('SELECT COUNT(*) as count FROM violations'),
            queryOne('SELECT COUNT(*) as count FROM violations WHERE status = "pending"')
        ]);

        // Build query parameters array
        const queryParams = [...dateParams];

        // Get recent logs with pagination
        const recentLogs = await queryMany(`
      SELECT 
        al.timestamp,
        al.entry_type,
        v.plate_number,
        up.full_name as user_name
      FROM access_logs al
      JOIN vehicles v ON al.vehicle_id = v.vehicle_id
      JOIN users u ON v.usc_id = u.usc_id
      JOIN user_profiles up ON u.usc_id = up.usc_id
      ${dateFilter}
      ORDER BY al.timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `, queryParams);

        const reportData = {
            userStats: {
                total: totalUsers?.count || 0,
                students: studentCount?.count || 0,
                faculty: facultyCount?.count || 0,
                staff: staffCount?.count || 0,
                newThisMonth: newUsersThisMonth?.count || 0
            },
            vehicleStats: {
                total: totalVehicles?.count || 0,
                approved: approvedVehicles?.count || 0,
                twoWheel: twoWheelVehicles?.count || 0,
                fourWheel: fourWheelVehicles?.count || 0
            },
            accessStats: {
                total: totalAccessLogs?.count || 0,
                inRange: accessLogsCount?.count || 0
            },
            violationStats: {
                total: totalViolations?.count || 0,
                pending: pendingViolations?.count || 0
            },
            recentLogs: recentLogs || []
        };

        const responseData = {
            reportData,
            totalEntries: accessLogsCount?.count || 0,
            currentPage: page,
            entriesPerPage: limit,
            totalPages: Math.ceil((accessLogsCount?.count || 0) / limit)
        };

        // Cache the data
        if (CacheConfig.SYSTEM_OVERVIEW.enabled) {
            CacheManager.cacheReportData('overview', { startDate, endDate, page, limit }, responseData, CacheConfig.SYSTEM_OVERVIEW.ttl);
        }

        return Response.json({
            success: true,
            ...responseData
        });

    } catch (error) {
        console.error('Reports API error:', error);
        return Response.json(
            { error: 'Failed to fetch report data' },
            { status: 500 }
        );
    }
}