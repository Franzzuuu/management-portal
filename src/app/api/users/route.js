import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the search query from URL params
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query')?.toLowerCase() || '';

        // If query is less than 2 characters and it's a search request, return empty array
        if (query && query.length < 2) {
            return Response.json({
                success: true,
                users: []
            });
        }

        // Build the SQL query
        let sql = `
            SELECT 
                u.id,
                u.email,
                u.designation,
                up.full_name
            FROM users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.status = 'active'
        `;

        const params = [];

        // Add search conditions if query exists
        if (query) {
            sql += ` AND (
                LOWER(up.full_name) LIKE ?
                OR LOWER(u.email) LIKE ?
                OR LOWER(u.designation) LIKE ?
            )`;
            const searchPattern = `%${query}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        sql += ` ORDER BY up.full_name ASC LIMIT 10`;

        // Execute the query
        const users = await queryMany(sql, params);

        return Response.json({
            success: true,
            users: users || []
        });

    } catch (error) {
        console.error('Fetch users error:', error);
        return Response.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
