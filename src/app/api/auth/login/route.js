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
        const sessionToken = await createSession(authResult.user.usc_id, authResult.user.designation);

        // Set cookie with 30-day expiration
        const cookieStore = await cookies();
        cookieStore.set('session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 // 30 days for persistent login
        });

        // Return user data (without sensitive info)
        const {
            usc_id,
            email: userEmail,
            designation,
            full_name,
            phone_number,
            department,
            profile_picture,
            profile_picture_type
        } = authResult.user;

        return Response.json({
            success: true,
            user: {
                usc_id,
                email: userEmail,
                designation,
                fullName: full_name,
                phoneNumber: phone_number,
                department,
                profile_picture: profile_picture ? true : false, // Just indicate presence
                profile_picture_type
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