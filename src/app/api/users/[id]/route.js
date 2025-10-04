import { queryOne } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function GET(request, { params }) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = params.id;

        // Get user with profile
        const user = await queryOne(`
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
            WHERE u.id = ?
        `, [userId]);

        if (!user) {
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return Response.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Fetch user error:', error);
        return Response.json(
            { error: 'Failed to fetch user' },
            { status: 500 }
        );
    }
}