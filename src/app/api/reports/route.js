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

        // Get user statistics with proper date filtering
        const [totalUsers, studentCount, facultyCount, staffCount, adminCount, securityCount, activeUsersInRange, userDistribution] = await Promise.all([
            queryOne('SELECT COUNT(*) as count FROM users WHERE status = "active"'),
            queryOne('SELECT COUNT(*) as count FROM users WHERE designation = "Student" AND status = "active"'),
            queryOne('SELECT COUNT(*) as count FROM users WHERE designation = "Faculty" AND status = "active"'),
            queryOne('SELECT COUNT(*) as count FROM users WHERE designation = "Staff" AND status = "active"'),
            queryOne('SELECT COUNT(*) as count FROM users WHERE designation = "Admin" AND status = "active"'),
            queryOne('SELECT COUNT(*) as count FROM users WHERE designation = "Security" AND status = "active"'),
            startDate && endDate 
                ? queryOne(`SELECT COUNT(DISTINCT u.id) as count FROM users u JOIN vehicles v ON u.usc_id = v.usc_id JOIN access_logs al ON v.vehicle_id = al.vehicle_id WHERE u.status = "active" AND DATE(al.timestamp) BETWEEN ? AND ?`, dateParams)
                : queryOne('SELECT COUNT(DISTINCT u.id) as count FROM users u JOIN vehicles v ON u.usc_id = v.usc_id JOIN access_logs al ON v.vehicle_id = al.vehicle_id WHERE u.status = "active"'),
            queryMany('SELECT designation, COUNT(*) as count FROM users WHERE status = "active" GROUP BY designation ORDER BY count DESC')
        ]);

        // Get vehicle statistics with proper date filtering
        const vehicleDateFilter = startDate && endDate ? 'WHERE DATE(v.created_at) BETWEEN ? AND ?' : '';
        const [totalVehicles, approvedVehicles, twoWheelVehicles, fourWheelVehicles, vehicleDistribution] = await Promise.all([
            queryOne('SELECT COUNT(*) as count FROM vehicles'),
            queryOne('SELECT COUNT(*) as count FROM vehicles WHERE approval_status = "approved"'),
            queryOne('SELECT COUNT(*) as count FROM vehicles WHERE vehicle_type = "2-wheel"'),
            queryOne('SELECT COUNT(*) as count FROM vehicles WHERE vehicle_type = "4-wheel"'),
            queryMany('SELECT vehicle_type, COUNT(*) as count FROM vehicles GROUP BY vehicle_type ORDER BY count DESC')
        ]);

        // Get access log statistics with enhanced data
        const [totalAccessLogs, accessLogsCount, entriesCount, exitsCount, peakEntryHour, peakExitHour, accessDistribution] = await Promise.all([
            queryOne('SELECT COUNT(*) as count FROM access_logs'),
            queryOne(`SELECT COUNT(*) as count FROM access_logs al ${dateFilter}`, dateParams),
            queryOne(`SELECT COUNT(*) as count FROM access_logs al WHERE entry_type = "entry" ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''}`, dateParams),
            queryOne(`SELECT COUNT(*) as count FROM access_logs al WHERE entry_type = "exit" ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''}`, dateParams),
            queryOne(`SELECT HOUR(timestamp) as hour, COUNT(*) as count FROM access_logs al WHERE entry_type = "entry" ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''} GROUP BY HOUR(timestamp) ORDER BY count DESC LIMIT 1`, dateParams),
            queryOne(`SELECT HOUR(timestamp) as hour, COUNT(*) as count FROM access_logs al WHERE entry_type = "exit" ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''} GROUP BY HOUR(timestamp) ORDER BY count DESC LIMIT 1`, dateParams),
            queryMany(`SELECT HOUR(timestamp) as hour, entry_type, COUNT(*) as count FROM access_logs al ${dateFilter} GROUP BY HOUR(timestamp), entry_type ORDER BY hour`, dateParams)
        ]);

        // Get violation statistics with proper date filtering
        const violationDateFilter = startDate && endDate ? 'WHERE DATE(v.created_at) BETWEEN ? AND ?' : '';
        const [totalViolations, pendingViolations, resolvedViolations, violationTypes] = await Promise.all([
            queryOne(`SELECT COUNT(*) as count FROM violations v ${violationDateFilter}`, dateParams),
            queryOne(`SELECT COUNT(*) as count FROM violations v WHERE status = "pending" ${violationDateFilter ? 'AND ' + violationDateFilter.replace('WHERE ', '') : ''}`, dateParams),
            queryOne(`SELECT COUNT(*) as count FROM violations v WHERE status = "resolved" ${violationDateFilter ? 'AND ' + violationDateFilter.replace('WHERE ', '') : ''}`, dateParams),
            queryMany(`SELECT vt.name as type, COUNT(*) as count FROM violations v JOIN violation_types vt ON v.violation_type_id = vt.id ${violationDateFilter} GROUP BY v.violation_type_id, vt.name ORDER BY count DESC`, dateParams)
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
                admin: adminCount?.count || 0,
                security: securityCount?.count || 0,
                activeInRange: activeUsersInRange?.count || 0,
                distribution: userDistribution || []
            },
            vehicleStats: {
                total: totalVehicles?.count || 0,
                approved: approvedVehicles?.count || 0,
                twoWheel: twoWheelVehicles?.count || 0,
                fourWheel: fourWheelVehicles?.count || 0,
                distribution: vehicleDistribution || []
            },
            accessStats: {
                total: totalAccessLogs?.count || 0,
                inRange: accessLogsCount?.count || 0,
                entries: entriesCount?.count || 0,
                exits: exitsCount?.count || 0,
                peakEntryHour: peakEntryHour?.hour !== undefined ? peakEntryHour.hour : null,
                peakExitHour: peakExitHour?.hour !== undefined ? peakExitHour.hour : null,
                hourlyDistribution: accessDistribution || []
            },
            violationStats: {
                total: totalViolations?.count || 0,
                pending: pendingViolations?.count || 0,
                resolved: resolvedViolations?.count || 0,
                byType: violationTypes || []
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