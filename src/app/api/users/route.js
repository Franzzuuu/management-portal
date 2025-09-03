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

        // Get filtered active users with their profiles
        const searchPattern = `%${query}%`;
        const users = await queryMany(`
            SELECT 
                u.id,
                u.email,
                u.designation,
                up.full_name
            FROM users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.status = 'active'
            ${query ? `
            AND (
                LOWER(up.full_name) LIKE ?
                OR LOWER(u.email) LIKE ?
                OR LOWER(u.designation) LIKE ?
            )` : ''}
            ORDER BY up.full_name ASC
            LIMIT 10
        `, query ? [searchPattern, searchPattern, searchPattern] : []);

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
