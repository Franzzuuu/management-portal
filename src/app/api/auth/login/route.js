import { authenticateUser } from '@/lib/auth';
import { createSession } from '@/lib/utils';
import { cookies } from 'next/headers';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        // Validate input
        if (!email || !password) {
            return Response.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Authenticate user
        const authResult = await authenticateUser(email, password);

        if (!authResult.success) {
            return Response.json(
                { error: authResult.message },
                { status: 401 }
            );
        }

        // Create session
        const sessionToken = await createSession(authResult.user.id, authResult.user.designation);

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set('session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 // 7 days
        });

        // Return user data (without sensitive info)
        const { id, email: userEmail, designation, full_name, phone_number } = authResult.user;

        return Response.json({
            success: true,
            user: {
                id,
                email: userEmail,
                designation,
                fullName: full_name,
                phoneNumber: phone_number
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return Response.json(
            { error: 'Login failed. Please try again.' },
            { status: 500 }
        );
    }
}