import { executeQuery } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function PUT(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, status } = await request.json();

        // Validate input
        if (!userId || !status) {
            return Response.json(
                { error: 'User ID and status are required' },
                { status: 400 }
            );
        }

        // Validate status values
        const validStatuses = ['active', 'inactive', 'pending'];
        if (!validStatuses.includes(status)) {
            return Response.json(
                { error: 'Invalid status. Must be active, inactive, or pending' },
                { status: 400 }
            );
        }

        // Prevent admin from deactivating themselves
        if (session.userId == userId && status === 'inactive') {
            return Response.json(
                { error: 'You cannot deactivate your own account' },
                { status: 400 }
            );
        }

        // Update user status
        const result = await executeQuery(
            'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, userId]
        );

        if (result.affectedRows === 0) {
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return Response.json({
            success: true,
            message: `User status updated to ${status}`
        });

    } catch (error) {
        console.error('Update user status error:', error);
        return Response.json(
            { error: 'Failed to update user status' },
            { status: 500 }
        );
    }
}
