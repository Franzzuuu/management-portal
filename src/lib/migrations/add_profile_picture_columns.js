import { executeQuery } from '../database.js';

export async function addProfilePictureColumns() {
    try {
        console.log('Adding profile picture columns to users table...');

        await executeQuery(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS profile_picture LONGBLOB NULL,
            ADD COLUMN IF NOT EXISTS profile_picture_type VARCHAR(100) NULL
        `);

        console.log('Profile picture columns added successfully!');
        return true;
    } catch (error) {
        console.error('Failed to add profile picture columns:', error);
        throw error;
    }
}