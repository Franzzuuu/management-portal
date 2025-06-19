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

// Create new user
export async function createUser(userData) {
    const { email, password, designation, fullName, phoneNumber, gender } = userData;

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
        // Start transaction-like operation
        // Insert user
        const userResult = await executeQuery(
            'INSERT INTO users (email, password_hash, designation, status) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, designation, 'active']
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

// Update user status
export async function updateUserStatus(userId, status) {
    await executeQuery(
        'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, userId]
    );
}