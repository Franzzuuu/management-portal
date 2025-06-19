import { getSession } from '@/lib/utils';
import { findUserById } from '@/lib/auth';

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
        const user = await findUserById(session.userId);

        if (!user) {
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Return user data (without sensitive info)
        const { id, email, designation, full_name, phone_number, gender, status } = user;

        return Response.json({
            success: true,
            user: {
                id,
                email,
                designation,
                fullName: full_name,
                phoneNumber: phone_number,
                gender,
                status
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