import { queryOne, executeQuery } from './database.js';

/**
 * Generate a unique 4-digit PIN using only digits 0, 1, 2, 3
 * Maximum possible combinations: 4^4 = 256 unique PINs
 * 
 * @returns {Promise<string>} A unique 4-digit PIN
 */
export async function generateUniquePin() {
    const maxAttempts = 256; // Maximum possible unique PINs
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        const pin = generateRandomPin();
        
        // Check if PIN already exists
        const existing = await queryOne(
            'SELECT id FROM users WHERE pin = ?',
            [pin]
        );
        
        if (!existing) {
            return pin;
        }
        
        attempts++;
    }
    
    throw new Error('Unable to generate unique PIN: All possible combinations exhausted');
}

/**
 * Generate a random 4-digit PIN using only 0, 1, 2, 3
 * @returns {string} A 4-digit PIN string
 */
function generateRandomPin() {
    const digits = ['0', '1', '2', '3'];
    let pin = '';
    
    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * digits.length);
        pin += digits[randomIndex];
    }
    
    return pin;
}

/**
 * Validate PIN format
 * @param {string} pin - PIN to validate
 * @returns {boolean} True if valid
 */
export function validatePinFormat(pin) {
    if (!pin || typeof pin !== 'string') {
        return false;
    }
    
    // Must be exactly 4 characters
    if (pin.length !== 4) {
        return false;
    }
    
    // Must contain only 0, 1, 2, 3
    return /^[0-3]{4}$/.test(pin);
}

/**
 * Auto-generate PIN for a user if they don't have one
 * Only generates for Admin/Security roles
 * 
 * @param {string} uscId - User's USC ID
 * @param {string} designation - User's role
 * @returns {Promise<string|null>} Generated PIN or null if not applicable
 */
export async function autoGeneratePinIfNeeded(uscId, designation) {
    // Only generate for Admin/Security roles
    if (!['Admin', 'Security'].includes(designation)) {
        return null;
    }
    
    // Check if user already has a PIN
    const user = await queryOne(
        'SELECT pin FROM users WHERE usc_id = ?',
        [uscId]
    );
    
    if (!user) {
        throw new Error('User not found');
    }
    
    // If PIN already exists, return it
    if (user.pin) {
        return user.pin;
    }
    
    // Generate new unique PIN
    const newPin = await generateUniquePin();
    
    // Update user with new PIN
    await executeQuery(
        'UPDATE users SET pin = ? WHERE usc_id = ?',
        [newPin, uscId]
    );
    
    console.log(`Generated PIN for user ${uscId}: ${newPin}`);
    return newPin;
}

/**
 * Get user ID by PIN (for handheld device authentication)
 * 
 * @param {string} pin - 4-digit PIN
 * @returns {Promise<object|null>} User object with id and uscId, or null if not found
 */
export async function getUserByPin(pin) {
    if (!validatePinFormat(pin)) {
        return null;
    }
    
    const user = await queryOne(
        'SELECT id, usc_id, designation FROM users WHERE pin = ? AND designation IN ("Admin", "Security")',
        [pin]
    );
    
    return user || null;
}
