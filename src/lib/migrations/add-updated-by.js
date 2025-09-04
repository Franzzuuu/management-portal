import { executeQuery } from '@/lib/database';

async function addUpdatedByColumn() {
    try {
        console.log('Starting migration...');

        // Check if column exists first
        const checkQuery = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'violations' 
            AND COLUMN_NAME = 'updated_by'
        `;

        const columnExists = await executeQuery(checkQuery);

        if (columnExists.length > 0) {
            console.log('Column updated_by already exists');
            return;
        }

        // Add the column
        const alterQuery = `
            ALTER TABLE violations
            ADD COLUMN updated_by BIGINT UNSIGNED DEFAULT NULL,
            ADD FOREIGN KEY (updated_by) REFERENCES users(id)
        `;

        await executeQuery(alterQuery);
        console.log('Successfully added updated_by column');

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

// Run the migration
addUpdatedByColumn()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
