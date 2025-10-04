import { addProfilePictureColumns } from './lib/migrations/add_profile_picture_columns.js';

async function runMigration() {
    try {
        await addProfilePictureColumns();
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();