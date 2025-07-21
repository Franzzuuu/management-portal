import { getSession } from '@/lib/utils';
import { queryOne } from '@/lib/database';

export async function GET() {
    try {
        const session = await getSession();

        if (!session) {
            return Response.json({ error: 'No active session' }, { status: 401 });
        }

        // Get updated user information from database
        const user = await queryOne(`
            SELECT 
                u.id,
                u.email,
                u.designation,
                u.created_at,
                up.full_name
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = ?
        `, [session.userId]);

        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        return Response.json({
            success: true,
            user: {
                id: user.id,
                username: user.email, // Use email as username for compatibility
                email: user.email,
                designation: user.designation,
                full_name: user.full_name || user.email,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Session API error:', error);
        return Response.json(
            { error: 'Failed to get session' },
            { status: 500 }
        );
    }
}