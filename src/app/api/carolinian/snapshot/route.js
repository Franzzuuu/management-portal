import { queryMany } from '@/lib/database';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return Response.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        // Get user's vehicles
        const vehiclesQuery = `
            SELECT COUNT(*) as count
            FROM vehicles v
            JOIN users u ON v.usc_id = u.usc_id
            WHERE u.usc_id = ?
        `;
        const vehiclesResult = await queryMany(vehiclesQuery, [userId]);
        const registeredVehicles = parseInt(vehiclesResult[0]?.count || 0);

        // Get user's total violations (need to join through vehicles table)
        const violationsQuery = `
            SELECT COUNT(*) as count
            FROM violations viol
            JOIN vehicles v ON viol.vehicle_id = v.vehicle_id
            JOIN users u ON v.usc_id = u.usc_id
            WHERE u.usc_id = ?
        `;
        const violationsResult = await queryMany(violationsQuery, [userId]);
        const totalViolations = parseInt(violationsResult[0]?.count || 0);

        // Get pending appeals from violation_contests table
        const appealsQuery = `
            SELECT COUNT(*) as count
            FROM violation_contests vc
            JOIN violations v ON vc.violation_id = v.id
            JOIN vehicles ve ON v.vehicle_id = ve.vehicle_id
            JOIN users u ON ve.usc_id = u.usc_id
            WHERE u.usc_id = ? 
            AND vc.contest_status = 'pending'
        `;
        const appealsResult = await queryMany(appealsQuery, [userId]);
        const pendingAppeals = parseInt(appealsResult[0]?.count || 0);

        // Get recent violations
        const recentViolations = await queryMany(`
            SELECT 
                'violation' as type,
                CONCAT('Violation issued: ', vt.name, ' - ', ve.plate_number) as description,
                v.created_at as timestamp
            FROM violations v
            JOIN vehicles ve ON v.vehicle_id = ve.vehicle_id
            JOIN violation_types vt ON v.violation_type_id = vt.id
            JOIN users u ON ve.usc_id = u.usc_id
            WHERE u.usc_id = ?
            ORDER BY v.created_at DESC
            LIMIT 5
        `, [userId]);

        // Get recent access logs
        const recentLogs = await queryMany(`
            SELECT 
                'access' as type,
                CONCAT(
                    'Vehicle ', ve.plate_number, ' ', 
                    CASE 
                        WHEN al.entry_type = 'entry' THEN 'entered campus'
                        ELSE 'exited campus'
                    END,
                    ' at Main Gate'
                ) as description,
                al.timestamp
            FROM access_logs al
            JOIN vehicles ve ON al.vehicle_id = ve.vehicle_id
            JOIN users u ON ve.usc_id = u.usc_id
            WHERE u.usc_id = ?
            ORDER BY al.timestamp DESC
            LIMIT 5
        `, [userId]);

        // Combine and sort recent activity
        const recentActivity = [...recentViolations, ...recentLogs]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 8)
            .map(activity => ({
                ...activity,
                timestamp: new Date(activity.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }));

        return Response.json({
            success: true,
            registeredVehicles,
            totalViolations,
            pendingAppeals,
            recentActivity
        });

    } catch (error) {
        console.error('Carolinian snapshot API error:', error);
        return Response.json({
            success: false,
            error: 'Failed to fetch carolinian snapshot data',
            registeredVehicles: 0,
            totalViolations: 0,
            pendingAppeals: 0,
            recentActivity: []
        }, { status: 500 });
    }
}