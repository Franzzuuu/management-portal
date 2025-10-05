import { getSession } from '@/lib/utils';
import { findUserByUscId } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();

        if (!session) {
            return Response.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Get user details
        const user = await findUserByUscId(session.uscId);

        if (!user) {
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Return user data (without sensitive info)
        const { id, email, designation, full_name, phone_number, gender, status, usc_id, must_change_password } = user;

        return Response.json({
            success: true,
            user: {
                id,
                email,
                designation,
                fullName: full_name,
                phoneNumber: phone_number,
                gender,
                status,
                uscId: usc_id,  // Add USC ID to the response
                must_change_password: Boolean(must_change_password)
            }
        });

    } catch (error) {
        console.error('Get current user error:', error);
        return Response.json(
            { error: 'Failed to get user information' },
            { status: 500 }
        );
    }
}