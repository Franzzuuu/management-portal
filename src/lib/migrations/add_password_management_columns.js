import { executeQuery, queryOne } from '../database.js';

export async function addPasswordManagementColumns() {
    try {
        // Check if usc_id column exists in users table
        const checkUscId = await queryOne(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'usc_id'
            AND TABLE_SCHEMA = DATABASE()
        `);

        if (!checkUscId) {
            // Add usc_id column to users table
            await executeQuery(`
                ALTER TABLE users 
                ADD COLUMN usc_id VARCHAR(20) UNIQUE NULL 
                AFTER id
            `);
            console.log('Added usc_id column to users table');
        } else {
            console.log('usc_id column already exists in users table');
        }

        // Check if must_change_password column exists
        const checkMustChange = await queryOne(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'must_change_password'
            AND TABLE_SCHEMA = DATABASE()
        `);

        if (!checkMustChange) {
            // Add must_change_password column
            await executeQuery(`
                ALTER TABLE users 
                ADD COLUMN must_change_password TINYINT(1) DEFAULT 1 
                AFTER password_hash
            `);
            console.log('Added must_change_password column to users table');
        } else {
            console.log('must_change_password column already exists in users table');
        }

        // Check if password_changed_at column exists
        const checkPasswordChangedAt = await queryOne(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'password_changed_at'
            AND TABLE_SCHEMA = DATABASE()
        `);

        if (!checkPasswordChangedAt) {
            // Add password_changed_at column
            await executeQuery(`
                ALTER TABLE users 
                ADD COLUMN password_changed_at DATETIME NULL 
                AFTER must_change_password
            `);
            console.log('Added password_changed_at column to users table');
        } else {
            console.log('password_changed_at column already exists in users table');
        }

        console.log('Successfully added all password management columns');
        return { success: true, message: 'Password management columns added successfully' };

    } catch (error) {
        console.error('Error adding password management columns:', error);
        throw new Error(`Failed to add password management columns: ${error.message}`);
    }
}