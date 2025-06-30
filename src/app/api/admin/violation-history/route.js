import { executeQuery } from '@/lib/database';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        if (userId) {
            // Get violation history for specific user
            const userHistory = await executeQuery(`
                SELECT 
                    v.*,
                    vt.name as violation_type_name,
                    ve.plate_number,
                    ve.make,
                    ve.model,
                    reporter.email as reported_by_email,
                    up_reporter.full_name as reported_by_name
                FROM violations v
                JOIN violation_types vt ON v.violation_type_id = vt.id
                JOIN vehicles ve ON v.vehicle_id = ve.id
                JOIN users reporter ON v.reported_by = reporter.id
                JOIN user_profiles up_reporter ON reporter.id = up_reporter.user_id
                WHERE ve.user_id = ?
                ORDER BY v.created_at DESC
                LIMIT ? OFFSET ?
            `, [userId, limit, offset]);

            const totalCount = await executeQuery(`
                SELECT COUNT(*) as count 
                FROM violations v
                JOIN vehicles ve ON v.vehicle_id = ve.id
                WHERE ve.user_id = ?
            `, [userId]);

            return Response.json({
                history: userHistory,
                pagination: {
                    page,
                    limit,
                    total: totalCount[0].count,
                    totalPages: Math.ceil(totalCount[0].count / limit)
                }
            });
        } else {
            // Get all users with their violation statistics
            const userStats = await executeQuery(`
                SELECT 
                    u.id as user_id,
                    u.email,
                    up.full_name,
                    u.designation,
                    u.violation_count,
                    COUNT(DISTINCT v.id) as total_violations,
                    COUNT(DISTINCT CASE WHEN v.status = 'pending' THEN v.id END) as pending_violations,
                    COUNT(DISTINCT CASE WHEN v.status = 'resolved' THEN v.id END) as resolved_violations,
                    COUNT(DISTINCT CASE WHEN v.status = 'contested' THEN v.id END) as contested_violations,
                    MAX(v.created_at) as latest_violation_date
                FROM users u
                LEFT JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN vehicles ve ON u.id = ve.user_id
                LEFT JOIN violations v ON ve.id = v.vehicle_id
                WHERE u.status = 'active' AND u.violation_count > 0
                GROUP BY u.id, u.email, up.full_name, u.designation, u.violation_count
                ORDER BY u.violation_count DESC, latest_violation_date DESC
                LIMIT ? OFFSET ?
            `, [limit, offset]);

            const totalCount = await executeQuery(`
                SELECT COUNT(DISTINCT u.id) as count 
                FROM users u
                WHERE u.status = 'active' AND u.violation_count > 0
            `);

            return Response.json({
                users: userStats,
                pagination: {
                    page,
                    limit,
                    total: totalCount[0].count,
                    totalPages: Math.ceil(totalCount[0].count / limit)
                }
            });
        }
    } catch (error) {
        console.error('Violation history API error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}