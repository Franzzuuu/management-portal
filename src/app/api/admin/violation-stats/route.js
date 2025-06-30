import { executeQuery } from '@/lib/database';

export async function GET() {
    try {
        // Get top violators
        const topViolators = await executeQuery(`
            SELECT 
                u.id,
                up.full_name,
                u.email,
                u.designation,
                u.violation_count,
                COUNT(CASE WHEN v.status = 'pending' THEN 1 END) as active_violations
            FROM users u
            JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN vehicles ve ON u.id = ve.user_id
            LEFT JOIN violations v ON ve.id = v.vehicle_id
            WHERE u.violation_count > 0
            GROUP BY u.id, up.full_name, u.email, u.designation, u.violation_count
            ORDER BY u.violation_count DESC, active_violations DESC
            LIMIT 10
        `);

        // Get violation trends by month (last 12 months)
        const violationTrends = await executeQuery(`
            SELECT 
                DATE_FORMAT(v.created_at, '%Y-%m') as month,
                COUNT(*) as violations_count,
                COUNT(CASE WHEN v.status = 'resolved' THEN 1 END) as resolved_count,
                COUNT(CASE WHEN v.status = 'pending' THEN 1 END) as pending_count
            FROM violations v
            WHERE v.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(v.created_at, '%Y-%m')
            ORDER BY month DESC
        `);

        // Get violation types statistics
        const violationTypeStats = await executeQuery(`
            SELECT 
                vt.name,
                vt.description,
                COUNT(v.id) as total_count,
                COUNT(CASE WHEN v.status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN v.status = 'resolved' THEN 1 END) as resolved_count,
                COUNT(CASE WHEN v.status = 'contested' THEN 1 END) as contested_count
            FROM violation_types vt
            LEFT JOIN violations v ON vt.id = v.violation_type_id
            GROUP BY vt.id, vt.name, vt.description
            ORDER BY total_count DESC
        `);

        return Response.json({
            topViolators,
            violationTrends,
            violationTypeStats
        });
    } catch (error) {
        console.error('Violation stats API error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}