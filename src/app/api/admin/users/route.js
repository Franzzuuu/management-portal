import { executeQuery } from '@/lib/database';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        // Build where clause for search
        let whereClause = "u.status = 'active'";
        let params = [];

        if (search) {
            whereClause += ` AND (
                up.full_name LIKE ? OR 
                u.email LIKE ?
            )`;
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam);
        }

        // Get users with their profiles
        const users = await executeQuery(`
            SELECT 
                u.id,
                u.email,
                u.designation,
                u.violation_count,
                u.status,
                up.full_name,
                up.phone_number,
                up.gender
            FROM users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE ${whereClause}
            ORDER BY up.full_name ASC
        `, params);

        return Response.json({
            success: true,
            users
        });

    } catch (error) {
        console.error('Get users error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}