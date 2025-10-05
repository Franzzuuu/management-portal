import { changeUserPassword } from '@/lib/auth';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized: Only admins can change passwords' }, { status: 401 });
        }

        const { uscId, newPassword } = await request.json();

        // Validate required fields
        if (!uscId || !newPassword) {
            return Response.json(
                { error: 'USC ID and new password are required' },
                { status: 400 }
            );
        }

        // Change password
        const result = await changeUserPassword(uscId, newPassword, session.userId);

        return Response.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);

        return Response.json(
            { error: error.message || 'Failed to change password. Please try again.' },
            { status: 500 }
        );
    }
}