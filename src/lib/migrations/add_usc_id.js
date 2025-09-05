import { executeQuery, queryOne } from '../database.js';

export async function addUscIdColumn() {
    try {
        // Check if usc_id column already exists
        const checkColumn = await queryOne(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'user_profiles' 
            AND COLUMN_NAME = 'usc_id'
            AND TABLE_SCHEMA = DATABASE()
        `);

        if (checkColumn) {
            console.log('usc_id column already exists in user_profiles table');
            return { success: true, message: 'Column already exists' };
        }

        // Add usc_id column to user_profiles table
        await executeQuery(`
            ALTER TABLE user_profiles 
            ADD COLUMN usc_id VARCHAR(20) NULL 
            AFTER phone_number
        `);

        console.log('Successfully added usc_id column to user_profiles table');
        return { success: true, message: 'usc_id column added successfully' };

    } catch (error) {
        console.error('Error adding usc_id column:', error);
        throw new Error(`Failed to add usc_id column: ${error.message}`);
    }
}
