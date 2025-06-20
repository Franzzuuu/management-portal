import { queryOne, queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

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
        const [totalAccessLogs, accessLogsInRange] = await Promise.all([
            queryOne('SELECT COUNT(*) as count FROM access_logs WHERE DATE(timestamp) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'),
            queryOne('SELECT COUNT(*) as count FROM access_logs WHERE DATE(timestamp) BETWEEN ? AND ?', [startDate, endDate])
        ]);

        // Get violation statistics
        const [totalViolations, pendingViolations] = await Promise.all([
            queryOne('SELECT COUNT(*) as count FROM violations'),
            queryOne('SELECT COUNT(*) as count FROM violations WHERE status = "pending"')
        ]);

        // Get recent logs
        const recentLogs = await queryMany(`
      SELECT 
        al.timestamp,
        al.entry_type,
        v.plate_number,
        up.full_name as user_name
      FROM access_logs al
      JOIN vehicles v ON al.vehicle_id = v.id
      JOIN users u ON v.user_id = u.id
      JOIN user_profiles up ON u.id = up.user_id
      WHERE DATE(al.timestamp) BETWEEN ? AND ?
      ORDER BY al.timestamp DESC
      LIMIT 20
    `, [startDate, endDate]);

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
                inRange: accessLogsInRange?.count || 0
            },
            violationStats: {
                total: totalViolations?.count || 0,
                pending: pendingViolations?.count || 0
            },
            recentLogs: recentLogs || []
        };

        return Response.json({
            success: true,
            reportData
        });

    } catch (error) {
        console.error('Reports API error:', error);
        return Response.json(
            { error: 'Failed to fetch report data' },
            { status: 500 }
        );
    }
}