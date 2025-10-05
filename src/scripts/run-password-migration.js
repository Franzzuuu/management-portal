import { addPasswordManagementColumns } from '../lib/migrations/add_password_management_columns.js';

async function runMigration() {
    try {
        console.log('Running password management columns migration...');
        const result = await addPasswordManagementColumns();
        console.log('Migration completed successfully:', result);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();