import { executeQuery } from '@/lib/database';

async function checkTableStructure() {
    try {
        // Check users table id column type
        const userTableQuery = `
            SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'id';
        `;

        const userColumn = await executeQuery(userTableQuery);
        console.log('Users table id column:', userColumn);

        // Check violations table structure
        const violationsQuery = `
            SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'violations';
        `;

        const violationsColumns = await executeQuery(violationsQuery);
        console.log('Violations table columns:', violationsColumns);

    } catch (error) {
        console.error('Error checking table structure:', error);
    }
}

// Run the check
checkTableStructure()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
