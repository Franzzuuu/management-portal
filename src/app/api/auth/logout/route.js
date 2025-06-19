import { cookies } from 'next/headers';

export async function POST() {
    try {
        // Clear the session cookie
        const cookieStore = await cookies();
        cookieStore.set('session', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0 // Immediately expire
        });

        return Response.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        return Response.json(
            { error: 'Logout failed' },
            { status: 500 }
        );
    }
}