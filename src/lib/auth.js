import bcrypt from 'bcryptjs';
import { queryOne, executeQuery } from './database.js';

// Hash password
export async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

// Validate password requirements
export function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];

    if (password.length < minLength) {
        errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpperCase) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
        errors.push('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
        errors.push('Password must contain at least one special character');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Find user by email
export async function findUserByEmail(email) {
    const query = `
    SELECT u.*, up.full_name, up.phone_number, up.gender 
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id 
    WHERE u.email = ?
  `;
    return await queryOne(query, [email]);
}

// Find user by ID
export async function findUserById(id) {
    const query = `
    SELECT u.*, up.full_name, up.phone_number, up.gender 
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id 
    WHERE u.id = ?
  `;
    return await queryOne(query, [id]);
}

// Enhanced createUser function with status support
export async function createUser(userData) {
    const { email, password, designation, fullName, phoneNumber, gender, status } = userData;

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
        throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    try {
        // Insert user with specified status (default to 'active' if not provided)
        const userResult = await executeQuery(
            'INSERT INTO users (email, password_hash, designation, status) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, designation, status || 'active']
        );

        const userId = userResult.insertId;

        // Insert user profile
        await executeQuery(
            'INSERT INTO user_profiles (user_id, full_name, phone_number, gender) VALUES (?, ?, ?, ?)',
            [userId, fullName, phoneNumber || null, gender || null]
        );

        return { userId, email, designation };

    } catch (error) {
        console.error('Error creating user:', error);
        throw new Error('Failed to create user');
    }
}

// Authenticate user
export async function authenticateUser(email, password) {
    const user = await findUserByEmail(email);

    if (!user) {
        return { success: false, message: 'Invalid email or password' };
    }

    if (user.status !== 'active') {
        return { success: false, message: 'Account is not active' };
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
        return { success: false, message: 'Invalid email or password' };
    }

    // Return user data without password
    const { password_hash, ...userData } = user;

    return {
        success: true,
        user: userData
    };
}

// Get user by ID with profile
export async function getUserWithProfile(userId) {
    const query = `
        SELECT 
            u.*,
            up.full_name,
            up.phone_number,
            up.gender
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id 
        WHERE u.id = ?
    `;
    return await queryOne(query, [userId]);
}

// Update user profile information
export async function updateUserProfile(userId, profileData) {
    const { fullName, phoneNumber, gender } = profileData;

    try {
        await executeQuery(
            'UPDATE user_profiles SET full_name = ?, phone_number = ?, gender = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            [fullName, phoneNumber || null, gender || null, userId]
        );

        return { success: true };
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw new Error('Failed to update user profile');
    }
}

// Get users count by status (for dashboard stats)
export async function getUserStats() {
    const query = `
        SELECT 
            status,
            COUNT(*) as count
        FROM users 
        GROUP BY status
    `;
    const results = await executeQuery(query);

    const stats = {
        active: 0,
        inactive: 0,
        pending: 0,
        total: 0
    };

    results.forEach(row => {
        stats[row.status] = row.count;
        stats.total += row.count;
    });

    return stats;
}

// Update user status function
export async function updateUserStatus(userId, status) {
    const validStatuses = ['active', 'inactive', 'pending'];
    if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
    }

    try {
        await executeQuery(
            'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, userId]
        );
        return { success: true };
    } catch (error) {
        console.error('Error updating user status:', error);
        throw new Error('Failed to update user status');
    }
}