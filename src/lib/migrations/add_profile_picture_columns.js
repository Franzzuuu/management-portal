import { executeQuery } from '../database.js';

export async function addProfilePictureColumns() {
    try {
        console.log('Adding profile picture columns to user_profiles table...');

        await executeQuery(`
            ALTER TABLE user_profiles 
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