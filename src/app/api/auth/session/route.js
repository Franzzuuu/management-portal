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
                u.usc_id,
                u.email,
                u.designation,
                u.status,
                u.created_at,
                up.full_name,
                up.department,
                up.profile_picture_type
            FROM users u
            LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
            WHERE u.usc_id = ?
        `, [session.uscId]);

        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if user account is still active
        if (user.status !== 'active') {
            return Response.json({ error: 'Account is not active' }, { status: 403 });
        }

        return Response.json({
            success: true,
            user: {
                usc_id: user.usc_id,
                username: user.email, // Use email as username for compatibility
                email: user.email,
                designation: user.designation,
                full_name: user.full_name || user.email,
                created_at: user.created_at,
                department: user.department,
                hasProfilePicture: user.profile_picture_type ? true : false
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