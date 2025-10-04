import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure this is a Student or Faculty user
        if (!['Student', 'Faculty'].includes(session.userRole)) {
            return Response.json({ error: 'Access denied. Students and Faculty only.' }, { status: 403 });
        }

        const userId = session.userId;

        // Get user's vehicles count
        const vehiclesResult = await queryMany(`
            SELECT COUNT(*) as count
            FROM vehicles v
            JOIN users u ON v.usc_id = u.usc_id
            WHERE u.id = ?
        `, [userId]);
        const registeredVehicles = vehiclesResult[0]?.count || 0;

        // Get user's total violations count
        const violationsResult = await queryMany(`
            SELECT COUNT(*) as count
            FROM violations v
            JOIN vehicles ve ON v.vehicle_id = ve.vehicle_id
            JOIN users u ON ve.usc_id = u.usc_id
            WHERE u.id = ?
        `, [userId]);
        const totalViolations = violationsResult[0]?.count || 0;

        // Get pending appeals count (violations with contest_status = 'pending')
        // Use a conditional query in case the column doesn't exist yet
        let pendingAppeals = 0;
        try {
            const appealsResult = await queryMany(`
                SELECT COUNT(*) as count
                FROM violations v
                JOIN vehicles ve ON v.vehicle_id = ve.vehicle_id
                JOIN users u ON ve.usc_id = u.usc_id
                WHERE u.id = ? 
                AND v.contest_status = 'pending'
            `, [userId]);
            pendingAppeals = appealsResult[0]?.count || 0;
        } catch (error) {
            // If contest_status column doesn't exist, default to 0
            console.warn('Contest status column not found, defaulting to 0 pending appeals');
            pendingAppeals = 0;
        }

        // Get recent activity (last 10 violations and access logs)
        const recentViolations = await queryMany(`
            SELECT 
                'violation' as type,
                CONCAT('Violation issued: ', vt.name, ' - ', ve.plate_number) as description,
                v.created_at as timestamp
            FROM violations v
            JOIN vehicles ve ON v.vehicle_id = ve.vehicle_id
            JOIN violation_types vt ON v.violation_type_id = vt.id
            JOIN users u ON ve.usc_id = u.usc_id
            WHERE u.id = ?
            ORDER BY v.created_at DESC
            LIMIT 5
        `, [userId]);

        // Get recent access logs (using correct column name 'entry_type')
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
            WHERE u.id = ?
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
        console.error('Carolinian dashboard API error:', error);
        return Response.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}