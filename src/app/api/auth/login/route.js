import { authenticateUser } from '@/lib/auth';
import { createSession } from '@/lib/utils';
import { cookies } from 'next/headers';

export async function POST(request) {
    try {
        const { identifier, password } = await request.json();

        if (!identifier || !password) {
            return Response.json(
                { error: 'Email/USC ID and password are required' },
                { status: 400 }
            );
        }

        const authResult = await authenticateUser(identifier, password);

        if (!authResult.success) {
            return Response.json({ error: authResult.message }, { status: 401 });
        }

        // compute a safe "secure" flag for local LAN testing
        const forwardedProto = request.headers.get('x-forwarded-proto');
        const isHttps =
            (forwardedProto && forwardedProto.includes('https')) ||
            request.url.startsWith('https://');

        // optional override via .env.local: FORCE_INSECURE_COOKIES=true
        const forceInsecure = process.env.FORCE_INSECURE_COOKIES === 'true';
        const secureFlag = !forceInsecure && isHttps;

        // helper to set the cookie consistently
        const setSessionCookie = async (token) => {
            const cookieStore = await cookies();
            cookieStore.set('session', token, {
                httpOnly: true,
                sameSite: 'lax',
                secure: secureFlag, // <-- key change
                path: '/',
                maxAge: 30 * 24 * 60 * 60 // 30 days
            });
        };

        // --- Must-change-password branch ---
        if (authResult.mustChangePassword) {
            const sessionToken = await createSession(
                authResult.user.usc_id,
                authResult.user.designation
            );

            await setSessionCookie(sessionToken);

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
                    profile_picture: !!profile_picture,
                    profile_picture_type,
                    must_change_password: true
                }
            });
        }

        // --- Normal login branch ---
        const sessionToken = await createSession(
            authResult.user.usc_id,
            authResult.user.designation
        );

        await setSessionCookie(sessionToken);

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
                profile_picture: !!profile_picture,
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
