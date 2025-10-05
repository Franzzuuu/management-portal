/**
 * Client-side authentication helper functions
 */

/**
 * Delete a cookie by setting its expiration date to the past
 * @param {string} name - Cookie name to delete
 */
export function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

/**
 * Client-side logout helper
 * Clears cookies and local storage that might contain auth data
 */
export function clearAuthData() {
    // Clear the session cookie
    deleteCookie('session');

    // Clear any auth related localStorage items if you have any
    try {
        localStorage.removeItem('user');
        localStorage.removeItem('auth');
        // Add any other items you might be storing
    } catch (e) {
        console.error('Failed to clear localStorage', e);
    }
}