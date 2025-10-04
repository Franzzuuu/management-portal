import { queryMany } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET() {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all users with their profiles (including all statuses for admin)
        const users = await queryMany(`
            SELECT 
                u.id,
                u.email,
                u.designation,
                u.status,
                u.created_at,
                up.full_name,
                up.phone_number,
                up.gender
            FROM users u
            LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
            ORDER BY u.created_at DESC
        `);

        return Response.json({
            success: true,
            users: users || []
        });

    } catch (error) {
        console.error('Fetch all users error:', error);
        return Response.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}