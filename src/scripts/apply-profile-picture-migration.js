// A script to apply the profile picture migration to the database
import { addProfilePictureColumns } from '../lib/migrations/add_profile_picture_columns.js';

async function main() {
    console.log('Starting profile picture migration...');

    try {
        await addProfilePictureColumns();
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

main();