import { resetUserPassword } from '@/lib/auth';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized: Only admins can reset passwords' }, { status: 401 });
        }

        const { uscId } = await request.json();

        // Validate required fields
        if (!uscId) {
            return Response.json(
                { error: 'USC ID is required' },
                { status: 400 }
            );
        }

        // Reset password
        const result = await resetUserPassword(uscId, session.userId);

        return Response.json({
            success: true,
            message: `Password reset successfully. Default password: ${uscId}Usc$`
        });

    } catch (error) {
        console.error('Reset password error:', error);

        return Response.json(
            { error: error.message || 'Failed to reset password. Please try again.' },
            { status: 500 }
        );
    }
}