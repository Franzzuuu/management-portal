import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/utils';

// This function can be marked `async` if using `await` inside
export async function middleware(request) {
    const { pathname } = request.nextUrl;

    // Skip middleware for API routes, static files, and public assets
    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Allow access to login page and change-password page without authentication
    if (pathname === '/login' || pathname === '/change-password') {
        return NextResponse.next();
    }

    try {
        // Get session from cookies
        const sessionCookie = request.cookies.get('session');

        if (!sessionCookie) {
            // No session, redirect to login
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // Verify session and get user info
        const session = await verifySession(sessionCookie.value);

        if (!session.isValid) {
            // Invalid session, redirect to login
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // For now, continue with the request
        // The password change check will be handled by individual pages
        return NextResponse.next();

    } catch (error) {
        console.error('Middleware error:', error);
        // On error, redirect to login
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

// Configure which routes the middleware should run on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}