import { authenticateUser } from '@/lib/auth';
import { createSession } from '@/lib/utils';
import { cookies } from 'next/headers';

export async function POST(request) {
    try {
        const { identifier, password } = await request.json();

        // Validate input (changed email to identifier to support both email and USC ID)
        if (!identifier || !password) {
            return Response.json(
                { error: 'Email/USC ID and password are required' },
                { status: 400 }
            );
        }

        // Authenticate user (now supports email or USC ID)
        const authResult = await authenticateUser(identifier, password);

        if (!authResult.success) {
            return Response.json(
                { error: authResult.message },
                { status: 401 }
            );
        }

        // Check if user must change password
        if (authResult.mustChangePassword) {
            // For first-login password change, we still create a session but include the flag
            const sessionToken = await createSession(authResult.user.usc_id, authResult.user.designation);

            // Set cookie with 30-day expiration
            const cookieStore = await cookies();
            cookieStore.set('session', sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 // 30 days for persistent login
            });

            // Return user data with must_change_password flag
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
                mustChangePassword: true,
                user: {
                    usc_id,
                    email: userEmail,
                    designation,
                    fullName: full_name,
                    phoneNumber: phone_number,
                    department,
                    profile_picture: profile_picture ? true : false,
                    profile_picture_type,
                    must_change_password: true
                }
            });
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