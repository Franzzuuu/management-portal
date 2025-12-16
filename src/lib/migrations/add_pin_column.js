import { executeQuery, queryOne } from '../database.js';

/**
 * Migration to add PIN column to users table
 * PIN is a 4-digit code using only 0,1,2,3 for Admin/Security users
 */
export async function addPinColumn() {
    try {
        console.log('Checking for pin column in users table...');
        
        // Check if column exists
        const columnCheck = await queryOne(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME = 'pin'
        `);
        
        if (columnCheck) {
            console.log('✅ pin column already exists in users table');
            return { success: true, message: 'Column already exists' };
        }
        
        // Add pin column
        console.log('Adding pin column to users table...');
        await executeQuery(`
            ALTER TABLE users
            ADD COLUMN pin VARCHAR(4) UNIQUE NULL
            AFTER password_hash
        `);
        
        console.log('✅ pin column added successfully to users table');
        return { success: true, message: 'PIN column added successfully' };
        
    } catch (error) {
        console.error('❌ Error adding pin column:', error);
        throw new Error(`Failed to add pin column: ${error.message}`);
    }
}

// Run if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    addPinColumn()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}
