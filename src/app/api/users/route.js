import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all active users with their profiles
        const users = await queryMany(`
      SELECT 
        u.id,
        u.email,
        u.designation,
        up.full_name
      FROM users u
      JOIN user_profiles up ON u.id = up.user_id
      WHERE u.status = 'active'
      ORDER BY up.full_name ASC
    `);

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