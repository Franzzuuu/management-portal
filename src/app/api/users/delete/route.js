import { executeQuery, queryOne } from '@/lib/database';
import { getSession } from '@/lib/utils';

export async function DELETE(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = await request.json();

        // Validate input
        if (!userId) {
            return Response.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Check if user exists and get their info
        const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Prevent admin from deleting themselves
        if (session.userId == userId) {
            return Response.json(
                { error: 'You cannot delete your own account' },
                { status: 400 }
            );
        }

        // Prevent deletion of other admin accounts (optional security measure)
        if (user.designation === 'Admin') {
            return Response.json(
                { error: 'Cannot delete admin accounts. Change designation first.' },
                { status: 400 }
            );
        }

        // Delete user (CASCADE will handle related records)
        const result = await executeQuery('DELETE FROM users WHERE id = ?', [userId]);

        if (result.affectedRows === 0) {
            return Response.json(
                { error: 'Failed to delete user' },
                { status: 500 }
            );
        }

        return Response.json({
            success: true,
            message: 'User and all associated data deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        return Response.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
