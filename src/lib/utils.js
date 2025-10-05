import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const secretKey = process.env.SESSION_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

// Create session token
export async function createSession(uscId, userRole) {
    const payload = {
        uscId,
        userRole,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    const session = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(encodedKey);

    return session;
}

// Verify session token
export async function verifySession(token) {
    try {
        const { payload } = await jwtVerify(token, encodedKey, {
            algorithms: ['HS256']
        });

        return {
            isValid: true,
            uscId: payload.uscId,
            userRole: payload.userRole
        };
    } catch (error) {
        return {
            isValid: false,
            error: error.message
        };
    }
}

// Get session from cookies
export async function getSession() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
        return null;
    }

    const verification = await verifySession(sessionCookie.value);

    if (!verification.isValid) {
        return null;
    }

    return {
        uscId: verification.uscId,
        userId: verification.uscId, // Add alias for consistency
        userRole: verification.userRole
    };
}

// Delete session
export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}

// Format date for display
export function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format phone number
export function formatPhoneNumber(phone) {
    if (!phone) return '';

    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX if 10 digits
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    return phone;
}

// Validate email format
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Generate random string for passwords, etc.
export function generateRandomString(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return result;
}

// Role-based access control helper
export function hasPermission(userRole, requiredRole) {
    const roleHierarchy = {
        'Admin': 4,
        'Security': 3,
        'Faculty': 2,
        'Student': 1
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Get user-friendly role name
export function getRoleName(role) {
    const roleNames = {
        'Admin': 'Administrator',
        'Security': 'Security Personnel',
        'Faculty': 'Faculty Member',
        'Student': 'Student'
    };

    return roleNames[role] || role;
}