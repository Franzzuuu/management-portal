import { verifyPassword, hashPassword, validatePassword, findUserByUscId } from '@/lib/auth';
import { getSession } from '@/lib/utils';
import { executeQuery } from '@/lib/database';

export async function POST(request) {
    try {
        // Check if user is authenticated
        const session = await getSession();
        if (!session || !session.userId) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await request.json();

        // Validate required fields
        if (!currentPassword || !newPassword) {
            return Response.json(
                { error: 'Current password and new password are required' },
                { status: 400 }
            );
        }

        // Get user data
        const user = await findUserByUscId(session.userId);
        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if user must change password (only allow if must_change_password = 1)
        if (!user.must_change_password) {
            // If user doesn't need to change password and is not admin, reject
            if (user.designation !== 'Admin') {
                return Response.json(
                    { error: 'Password change not required. Contact administrator for password changes.' },
                    { status: 403 }
                );
            }
        }

        // Verify current password
        const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
            return Response.json(
                { error: 'Current password is incorrect' },
                { status: 400 }
            );
        }

        // Validate new password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return Response.json(
                { error: `Password validation failed: ${passwordValidation.errors.join(', ')}` },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedNewPassword = await hashPassword(newPassword);

        // Update password and reset must_change_password flag
        await executeQuery(
            'UPDATE users SET password_hash = ?, must_change_password = 0, password_changed_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE usc_id = ?',
            [hashedNewPassword, session.userId]
        );

        return Response.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        return Response.json(
            { error: 'Failed to change password. Please try again.' },
            { status: 500 }
        );
    }
}