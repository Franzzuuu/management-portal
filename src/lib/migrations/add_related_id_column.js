import { executeQuery } from '../database.js';

export async function addRelatedIdColumn() {
    try {
        console.log('Checking for related_id column in notifications table...');

        // Check if column exists
        const columns = await executeQuery(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'notifications' 
            AND COLUMN_NAME = 'related_id'
        `);

        if (columns.length === 0) {
            console.log('Adding related_id column to notifications table...');
            await executeQuery(`
                ALTER TABLE notifications 
                ADD COLUMN related_id INT NULL AFTER type
            `);
            console.log('✅ related_id column added successfully!');
        } else {
            console.log('✅ related_id column already exists');
        }

        return true;
    } catch (error) {
        console.error('❌ Error adding related_id column:', error);
        throw error;
    }
}

// Run if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    addRelatedIdColumn()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
