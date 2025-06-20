import { queryOne } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get all statistics in parallel
        const [
            totalUsers,
            totalVehicles,
            pendingApprovals,
            activeViolations,
            todayLogs
        ] = await Promise.all([
            // Total users count
            queryOne('SELECT COUNT(*) as count FROM users WHERE status = "active"'),

            // Total registered vehicles
            queryOne('SELECT COUNT(*) as count FROM vehicles WHERE approval_status = "approved"'),

            // Pending vehicle approvals
            queryOne('SELECT COUNT(*) as count FROM vehicles WHERE approval_status = "pending"'),

            // Active violations
            queryOne('SELECT COUNT(*) as count FROM violations WHERE status = "pending"'),

            // Today's access logs
            queryOne('SELECT COUNT(*) as count FROM access_logs WHERE DATE(timestamp) = CURDATE()')
        ]);

        // Get recent activity (last 5 entries)
        const recentActivity = await queryOne(`
      SELECT 
        'vehicle_entry' as type,
        v.plate_number,
        up.full_name as user_name,
        al.timestamp,
        al.entry_type
      FROM access_logs al
      JOIN vehicles v ON al.vehicle_id = v.id
      JOIN users u ON v.user_id = u.id
      JOIN user_profiles up ON u.id = up.user_id
      ORDER BY al.timestamp DESC
      LIMIT 5
    `);

        // Get latest registrations
        const latestRegistrations = await queryOne(`
      SELECT 
        up.full_name,
        v.plate_number,
        v.vehicle_type,
        v.created_at
      FROM vehicles v
      JOIN users u ON v.user_id = u.id
      JOIN user_profiles up ON u.id = up.user_id
      WHERE v.approval_status = 'pending'
      ORDER BY v.created_at DESC
      LIMIT 3
    `);

        return Response.json({
            success: true,
            stats: {
                totalUsers: totalUsers?.count || 0,
                totalVehicles: totalVehicles?.count || 0,
                pendingApprovals: pendingApprovals?.count || 0,
                activeViolations: activeViolations?.count || 0,
                todayLogs: todayLogs?.count || 0
            },
            recentActivity: Array.isArray(recentActivity) ? recentActivity : (recentActivity ? [recentActivity] : []),
            latestRegistrations: Array.isArray(latestRegistrations) ? latestRegistrations : (latestRegistrations ? [latestRegistrations] : [])
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        return Response.json(
            { error: 'Failed to fetch dashboard statistics' },
            { status: 500 }
        );
    }
}