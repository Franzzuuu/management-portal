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
    SELECT 
        u.*, 
        up.full_name, 
        up.phone_number, 
        up.gender,
        up.department,
        up.profile_picture,
        up.profile_picture_type
    FROM users u
    LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
    WHERE u.email = ?
  `;
    return await queryOne(query, [email]);
}

// Find user by USC ID
export async function findUserByUscId(uscId) {
    const query = `
    SELECT 
        u.*, 
        up.full_name, 
        up.phone_number, 
        up.gender,
        up.department,
        up.profile_picture,
        up.profile_picture_type
    FROM users u
    LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
    WHERE u.usc_id = ?
  `;
    return await queryOne(query, [uscId]);
}

// Enhanced createUser function with status support
export async function createUser(userData) {
    const { email, password, designation, fullName, phoneNumber, gender, status, uscId, department } = userData;

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists by email or USC ID
    const existingUser = await findUserByEmail(email);
    const existingUscId = uscId ? await findUserByUscId(uscId) : null;
    if (existingUser) {
        throw new Error('User with this email already exists');
    }
    if (existingUscId) {
        throw new Error('User with this USC ID already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    try {
        // Insert user with USC ID
        const userResult = await executeQuery(
            'INSERT INTO users (usc_id, email, password_hash, designation, status) VALUES (?, ?, ?, ?, ?)',
            [uscId, email, hashedPassword, designation, status || 'active']
        );

        // Insert user profile
        await executeQuery(
            'INSERT INTO user_profiles (usc_id, email, full_name, phone_number, gender) VALUES (?, ?, ?, ?, ?)',
            [uscId, email, fullName, phoneNumber || null, gender || null]
        );

        // Update user_profiles with department if provided
        if (department) {
            await executeQuery(
                'UPDATE user_profiles SET department = ? WHERE usc_id = ?',
                [department, uscId]
            );
        }

        return { uscId, email, designation };

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

// Get user by USC ID with profile
export async function getUserWithProfile(uscId) {
    const query = `
        SELECT 
            u.*,
            up.full_name,
            up.phone_number,
            up.gender,
            up.department,
            up.profile_picture,
            up.profile_picture_type
        FROM users u
        LEFT JOIN user_profiles up ON u.usc_id = up.usc_id
        WHERE u.usc_id = ?
    `;
    return await queryOne(query, [uscId]);
}

// Update user profile information
export async function updateUserProfile(uscId, profileData) {
    const { fullName, phoneNumber, gender, department, profilePicture, profilePictureType } = profileData;

    try {
        await executeQuery(
            'UPDATE user_profiles SET full_name = ?, phone_number = ?, gender = ?, updated_at = CURRENT_TIMESTAMP WHERE usc_id = ?',
            [fullName, phoneNumber || null, gender || null, uscId]
        );

        // Update profile details in user_profiles
        if (department || profilePicture || profilePictureType) {
            await executeQuery(
                'UPDATE user_profiles SET department = ?, profile_picture = ?, profile_picture_type = ? WHERE usc_id = ?',
                [department || null, profilePicture || null, profilePictureType || null, uscId]
            );
        }

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
export async function updateUserStatus(uscId, status) {
    const validStatuses = ['active', 'inactive', 'pending'];
    if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
    }

    try {
        await executeQuery(
            'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE usc_id = ?',
            [status, uscId]
        );
        return { success: true };
    } catch (error) {
        console.error('Error updating user status:', error);
        throw new Error('Failed to update user status');
    }
}