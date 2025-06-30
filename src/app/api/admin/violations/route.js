import { executeQuery } from '@/lib/database';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';
        const offset = (page - 1) * limit;

        // Build where clause
        let whereClause = '1=1';
        let params = [];

        if (search) {
            whereClause += ` AND (
                up.full_name LIKE ? OR 
                ve.plate_number LIKE ? OR 
                vt.name LIKE ?
            )`;
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        if (status !== 'all') {
            whereClause += ' AND v.status = ?';
            params.push(status);
        }

        // Get violations with pagination
        const violations = await executeQuery(`
            SELECT 
                v.*,
                vt.name as violation_type_name,
                vt.description as violation_type_description,
                ve.plate_number,
                ve.make,
                ve.model,
                ve.color,
                u.email as owner_email,
                up.full_name as owner_name,
                u.designation as owner_designation,
                reporter.email as reported_by_email,
                up_reporter.full_name as reported_by_name
            FROM violations v
            JOIN violation_types vt ON v.violation_type_id = vt.id
            JOIN vehicles ve ON v.vehicle_id = ve.id
            JOIN users u ON ve.user_id = u.id
            JOIN user_profiles up ON u.id = up.user_id
            JOIN users reporter ON v.reported_by = reporter.id
            JOIN user_profiles up_reporter ON reporter.id = up_reporter.user_id
            WHERE ${whereClause}
            ORDER BY v.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Get total count for pagination
        const totalResult = await executeQuery(`
            SELECT COUNT(*) as count
            FROM violations v
            JOIN violation_types vt ON v.violation_type_id = vt.id
            JOIN vehicles ve ON v.vehicle_id = ve.id
            JOIN users u ON ve.user_id = u.id
            JOIN user_profiles up ON u.id = up.user_id
            WHERE ${whereClause}
        `, params);

        return Response.json({
            success: true,
            violations,
            pagination: {
                page,
                limit,
                total: totalResult[0].count,
                totalPages: Math.ceil(totalResult[0].count / limit)
            }
        });

    } catch (error) {
        console.error('Get violations error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}