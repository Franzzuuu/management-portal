import { createUser } from '@/lib/auth';
import { getSession } from '@/lib/utils';

export async function POST(request) {
    try {
        // Check if user is authenticated and is admin
        const session = await getSession();
        if (!session || session.userRole !== 'Admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userData = await request.json();

        // Validate required fields
        const { email, password, designation, fullName } = userData;
        if (!email || !password || !designation || !fullName) {
            return Response.json(
                { error: 'Email, password, designation, and full name are required' },
                { status: 400 }
            );
        }

        // Create the user with initial status
        const result = await createUser({
            ...userData,
            status: userData.status || 'active' // Default to active if not specified
        });

        return Response.json({
            success: true,
            message: 'User created successfully',
            user: {
                userId: result.userId,
                email: result.email,
                designation: result.designation
            }
        });

    } catch (error) {
        console.error('Create user error:', error);

        // Handle specific error types
        if (error.message.includes('already exists')) {
            return Response.json(
                { error: 'A user with this email already exists' },
                { status: 409 }
            );
        }

        if (error.message.includes('Password validation failed')) {
            return Response.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return Response.json(
            { error: 'Failed to create user. Please try again.' },
            { status: 500 }
        );
    }
}